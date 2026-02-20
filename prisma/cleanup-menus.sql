-- حذف منوهای غیرضروری
-- AI Generator و هوش مصنوعی

-- حذف منوی AI Generator (اگر وجود داشته باشد)
DELETE FROM "Menu" WHERE menukey = 'admin-ai-generator';

-- حذف منوهای مرتبط با هوش مصنوعی (اگر menukey دارند)
DELETE FROM "Menu" WHERE menukey LIKE '%ai-generator%';

-- لیست منوهای باقیمانده برای بررسی
SELECT id, menukey, "order" FROM "Menu" ORDER BY "order";
