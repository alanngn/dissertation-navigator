-- Remove the seeded admin user; presets cascade via foreign key.
DELETE FROM "User" WHERE "id" = '00000000-0000-0000-0000-000000000001';
