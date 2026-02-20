/**
 * Script برای اضافه کردن منوی "لاگ مصرف توکن" به sidebar
 * 
 * استفاده:
 * npx tsx script/add-token-usage-menu.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔍 در حال بررسی منوی Reports...');

  // پیدا کردن منوی Reports (parent)
  let reportsMenu = await prisma.menu.findFirst({
    where: {
      OR: [
        { menukey: "admin-reports" },
        { url: "/admin/reports" },
      ],
    },
  });

  // اگر منوی Reports وجود نداشت، ایجاد کن
  if (!reportsMenu) {
    console.log('📝 ایجاد منوی Reports...');
    
    // پیدا کردن منوی اصلی (Main) برای اضافه کردن Reports
    const mainMenu = await prisma.menu.findFirst({
      where: {
        OR: [
          { menukey: "admin-dashboard" },
          { url: "/admin/dashboard" },
        ],
      },
    });

    if (!mainMenu) {
      console.error('❌ منوی اصلی یافت نشد. لطفاً ابتدا seed را اجرا کنید: npm run prisma:seed');
      process.exit(1);
    }

    // ایجاد منوی Reports
    reportsMenu = await prisma.menu.create({
      data: {
        menukey: "admin-reports",
        url: "/admin/reports",
        icon: null,
        order: 5,
        is_active: true,
        target: "_self",
        parentid: null,
        translations: {
          create: {
            lang: "FA",
            title: "گزارش‌ها",
          },
        },
      },
    });
    console.log('✅ منوی Reports ایجاد شد');
  } else {
    console.log('✅ منوی Reports از قبل وجود دارد');
  }

  // بررسی وجود منوی Token Usage
  let tokenUsageMenu = await prisma.menu.findFirst({
    where: {
      OR: [
        { menukey: "admin-reports-token-usage" },
        { url: "/admin/reports/token-usage" },
      ],
    },
  });

  // اگر منو وجود نداشت، ایجاد کن
  if (!tokenUsageMenu) {
    console.log('📝 ایجاد منوی Token Usage...');
    tokenUsageMenu = await prisma.menu.create({
      data: {
        menukey: "admin-reports-token-usage",
        url: "/admin/reports/token-usage",
        icon: "metrics", // آیکون chart/analytics
        order: 0,
        is_active: true,
        target: "_self",
        parentid: reportsMenu.menuid,
        translations: {
          create: {
            lang: "FA",
            title: "لاگ مصرف توکن",
          },
        },
      },
    });
    console.log('✅ منوی Token Usage ایجاد شد');
  } else {
    console.log('✅ منوی Token Usage از قبل وجود دارد');
    // اگر منو وجود دارد اما آیکون ندارد، آیکون را اضافه کن
    if (!tokenUsageMenu.icon) {
      console.log('📝 اضافه کردن آیکون به منوی Token Usage...');
      tokenUsageMenu = await prisma.menu.update({
        where: { menuid: tokenUsageMenu.menuid },
        data: { icon: "metrics" },
      });
      console.log('✅ آیکون اضافه شد');
    }
  }

  // بررسی وجود permission برای Admin
  const existingAdmin = await prisma.roleMenuPermissions.findUnique({
    where: {
      rolename_menukey: {
        rolename: "Admin",
        menukey: "admin-reports-token-usage",
      },
    },
  });

  if (!existingAdmin) {
    console.log('📝 ایجاد permission برای Admin...');
    await prisma.roleMenuPermissions.create({
      data: {
        rolename: "Admin",
        menukey: "admin-reports-token-usage",
        canview: true,
        canedit: true,
        candelete: true,
      },
    });
    console.log('✅ Permission برای Admin ایجاد شد');
  } else {
    console.log('✅ Permission برای Admin از قبل وجود دارد');
  }

  // بررسی وجود permission برای Super Admin
  const existingSuperAdmin = await prisma.roleMenuPermissions.findUnique({
    where: {
      rolename_menukey: {
        rolename: "Super Admin",
        menukey: "admin-reports-token-usage",
      },
    },
  });

  if (!existingSuperAdmin) {
    console.log('📝 ایجاد permission برای Super Admin...');
    await prisma.roleMenuPermissions.create({
      data: {
        rolename: "Super Admin",
        menukey: "admin-reports-token-usage",
        canview: true,
        canedit: true,
        candelete: true,
      },
    });
    console.log('✅ Permission برای Super Admin ایجاد شد');
  } else {
    console.log('✅ Permission برای Super Admin از قبل وجود دارد');
  }

  console.log('\n🎉 تمام! منوی "لاگ مصرف توکن" با موفقیت اضافه شد.');
  console.log('💡 لطفاً صفحه را refresh کنید تا منو در sidebar نمایش داده شود.');
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

