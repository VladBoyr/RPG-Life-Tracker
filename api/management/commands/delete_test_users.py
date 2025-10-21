from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Deletes all test users with a specific prefix. Usage: manage.py delete_test_users <prefix>'

    def add_arguments(self, parser):
        parser.add_argument('prefix', type=str, help='The username prefix for test users to be deleted')

    def handle(self, *args, **options):
        prefix = options['prefix']
        users_to_delete = User.objects.filter(username__startswith=prefix)

        if not users_to_delete.exists():
            self.stdout.write(self.style.WARNING(f'No users found with prefix "{prefix}".'))
            return

        count = users_to_delete.count()
        self.stdout.write(f'Found {count} user(s) with prefix "{prefix}". Deleting...')

        users_to_delete.delete()

        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} user(s).'))
