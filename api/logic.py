import random
from decimal import Decimal, ROUND_HALF_UP
from .models import LootItem, LootRarity

def recalculate_loot_chances(user, fixed_item=None, new_chance_for_fixed=Decimal('0.0')):
    available_items = list(LootItem.objects.filter(owner=user, received_date__isnull=True))

    if not available_items:
        return

    if len(available_items) == 1:
        available_items[0].base_chance = Decimal('100.0')
        available_items[0].save()
        return

    if new_chance_for_fixed:
        new_chance_for_fixed = new_chance_for_fixed.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if fixed_item:
            fixed_item.base_chance = new_chance_for_fixed

    remaining_chance = Decimal('100.0') - new_chance_for_fixed
    if remaining_chance < 0:
        remaining_chance = Decimal('0.0')

    other_items = [item for item in available_items if item != fixed_item]
    
    if not other_items:
        if fixed_item:
            fixed_item.base_chance = Decimal('100.0')
            fixed_item.save()
        return

    total_chance_of_others = sum(item.base_chance for item in other_items)

    if total_chance_of_others > Decimal('0.001'):
        coef = remaining_chance / total_chance_of_others
        for item in other_items:
            item.base_chance *= coef
    else:
        equal_chance = remaining_chance / len(other_items)
        for item in other_items:
            item.base_chance = equal_chance

    current_sum = Decimal('0.0')
    items_to_save = other_items + ([fixed_item] if fixed_item else [])
    
    for i, item in enumerate(items_to_save):
        item.base_chance = item.base_chance.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if item.base_chance < 0:
            item.base_chance = Decimal('0.0')
        
        if i == len(items_to_save) - 1:
            diff = Decimal('100.0') - sum(it.base_chance for it in items_to_save if it != item)
            item.base_chance = diff
        
    for item in items_to_save:
        item.save()


def get_weighted_random_award(available_items, pity_counter):
    if not available_items:
        return None, 0

    pity_bonus = pity_counter * Decimal('0.005') 
    
    non_common_items = [item for item in available_items if item.rarity != LootRarity.COMMON]
    distributable_bonus = Decimal('0.0')
    if non_common_items:
        distributable_bonus = pity_bonus / len(non_common_items)

    adjusted_chances = []
    total_adjusted_chance = Decimal('0.0')
    
    for item in available_items:
        chance = item.base_chance
        if item.rarity != LootRarity.COMMON:
            chance += distributable_bonus * 100
        
        if chance < 0: chance = Decimal('0.01')
        
        adjusted_chances.append({'item': item, 'chance': chance})
        total_adjusted_chance += chance

    if total_adjusted_chance <= 0:
        return random.choice(available_items), pity_counter + 1

    roll = Decimal(random.uniform(0, float(total_adjusted_chance)))
    current_sum = Decimal('0.0')
    
    for entry in adjusted_chances:
        current_sum += entry['chance']
        if roll < current_sum:
            won_item = entry['item']
            if won_item.rarity in [LootRarity.RARE, LootRarity.UNIQUE, LootRarity.LEGENDARY]:
                new_pity_counter = 0
            else:
                new_pity_counter = pity_counter + 1
            
            return won_item, new_pity_counter

    won_item = adjusted_chances[-1]['item']
    if won_item.rarity in [LootRarity.RARE, LootRarity.UNIQUE, LootRarity.LEGENDARY]:
        new_pity_counter = 0
    else:
        new_pity_counter = pity_counter + 1
    return won_item, new_pity_counter
