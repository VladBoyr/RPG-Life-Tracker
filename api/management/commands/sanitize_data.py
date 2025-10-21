from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.conf import settings

class Command(BaseCommand):
    help = 'Anonymizes user data for local development environments.'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stdout.write(self.style.ERROR(
                'This command is only meant to be run in a DEBUG environment. Aborting.'
            ))
            return

        self.stdout.write("Starting data sanitization...")
        
        users = User.objects.all()
        total_users = users.count()

        for i, user in enumerate(users):
            user.email = f"{user.username}@example.com"
            
            if not user.is_superuser:
                user.set_password('dev')
            else:
                user.set_password('admin')
            
            user.save()
            
            progress = (i + 1) / total_users * 100
            self.stdout.write(f'\rProcessing user {i+1}/{total_users} [{int(progress)}%]', ending='')

        self.stdout.write(self.style.SUCCESS('\nSuccessfully sanitized user data.'))
        self.stdout.write(self.style.SUCCESS("All non-admin users now have the password: 'devpassword'"))
        self.stdout.write(self.style.SUCCESS("All admin users now have the password: 'admin'"))
