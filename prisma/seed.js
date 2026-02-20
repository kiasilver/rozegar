import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding roles, permissions, categories, menus and default user for News Site...");

  // حذف داده‌های قدیمی - ترتیب مهم است (ابتدا وابسته‌ها، بعد والدها)
  await prisma.blogComment.deleteMany();
  await prisma.blogLike.deleteMany();
  await prisma.blogTagMap.deleteMany();
  await prisma.blogTagTranslation.deleteMany();
  await prisma.blogTag.deleteMany();
  await prisma.blogTranslation.deleteMany();
  await prisma.sliderItem.deleteMany();
  await prisma.blog.deleteMany();
  
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.userProvider.deleteMany();
  await prisma.recentActivity.deleteMany();
  await prisma.notificationTarget.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  
  // حذف کامل منوها و دسته‌بندی‌ها
  await prisma.roleMenuPermissions.deleteMany();
  await prisma.menuTranslation.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.blogCategoryTranslation.deleteMany();
  await prisma.blogCategory.deleteMany();

  // نقش‌های مورد نیاز برای سایت خبری
  const roles = [
    { name: 'Admin' },
    { name: 'Editor' },
    { name: 'Author' },
  ];

  await prisma.role.createMany({ data: roles });

  // دسترسی‌های مورد نیاز برای سایت خبری
  const permissions = [
    { name: 'view_dashboard' },
    { name: 'manage_users' },
    { name: 'create_blog' },
    { name: 'edit_blog' },
    { name: 'delete_blog' },
    { name: 'publish_blog' },
    { name: 'manage_categories' },
    { name: 'manage_tags' },
    { name: 'manage_comments' },
    { name: 'manage_menu' },
    { name: 'manage_seo' },
    { name: 'view_analytics' },
  ];

  await prisma.permission.createMany({ data: permissions });

  const allRoles = await prisma.role.findMany();
  const allPermissions = await prisma.permission.findMany();

  // تخصیص دسترسی‌ها به نقش‌ها
  const rolePermissionMap = {
    'Admin': allPermissions.map(p => p.name), // همه دسترسی‌ها
    'Editor': ['view_dashboard', 'create_blog', 'edit_blog', 'publish_blog', 'manage_categories', 'manage_tags', 'manage_comments', 'view_analytics'],
    'Author': ['view_dashboard', 'create_blog', 'edit_blog', 'manage_tags'],
  };

  for (const role of allRoles) {
    const permissionNames = rolePermissionMap[role.name] || [];
    const permissionsToAssign = allPermissions.filter(p => permissionNames.includes(p.name));
    
    for (const permission of permissionsToAssign) {
      await prisma.rolePermission.create({
        data: {
          role_id: role.id,
          permission_id: permission.id,
        },
      });
    }
  }

  // ایجاد کاربر پیش‌فرض Admin
  const adminRole = allRoles.find(role => role.name === 'Admin');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'مدیر سیستم',
      email: 'admin@news.com',
      password: adminPasswordHash,
      is_active: true,
      userrole: {
        create: {
          role_id: adminRole.id,
        },
      },
    },
  });

  // ایجاد کاربر kiabayat330@gmail.com با نقش Admin
  const kiaPasswordHash = await bcrypt.hash('12345', 10);
  
  const kiaUser = await prisma.user.upsert({
    where: { email: 'kiabayat330@gmail.com' },
    update: {
      password: kiaPasswordHash,
      is_active: true,
      userrole: {
        deleteMany: {},
        create: {
          role_id: adminRole.id,
        },
      },
    },
    create: {
      name: 'کیا بیات',
      email: 'kiabayat330@gmail.com',
      password: kiaPasswordHash,
      is_active: true,
      userrole: {
        create: {
          role_id: adminRole.id,
        },
      },
    },
  });

  // ایجاد دسته‌بندی‌های خبری
  const categories = [
    {
      name: 'اخبار روز اقتصادی',
      slug: 'akhabar-rooz-eghtesadi',
      description: 'اخبار روز اقتصادی',
      order: 1,
    },
    {
      name: 'مسکن و شهرسازی',
      slug: 'maskan-shahrsazi',
      description: 'اخبار مسکن و شهرسازی',
      order: 2,
    },
    {
      name: 'راه های کشور',
      slug: 'rah-haye-keshvar',
      description: 'اخبار راه‌های کشور',
      order: 3,
    },
    {
      name: 'بنادر و دریانوردی',
      slug: 'bandar-daryanavardi',
      description: 'اخبار بنادر و دریانوردی',
      order: 4,
    },
    {
      name: 'قیمت روز',
      slug: 'ghimat-rooz',
      description: 'قیمت روز',
      order: 5,
    },
    {
      name: 'ارزدیجیتال',
      slug: 'arz-digital',
      description: 'اخبار و قیمت ارزهای دیجیتال',
      order: 6,
    },
    {
      name: 'آخرین قیمت‌ها در بازار',
      slug: 'akharin-ghimat-ha-bazar',
      description: 'آخرین قیمت‌ها در بازار',
      order: 7,
    },
    {
      name: 'بورس',
      slug: 'bourse',
      description: 'اخبار و تحلیل‌های بورس و بازار سرمایه',
      order: 8,
    },
      slug: 'havades',
      description: 'اخبار حوادث',
      order: 19,
    },
    {
      name: 'محیط زیست',
      slug: 'mohit-zist',
      description: 'اخبار محیط زیست',
      order: 20,
    },
    {
      name: 'بانک و بیمه',
      slug: 'bank-bime',
      description: 'اخبار بانک و بیمه',
      order: 21,
    },
    {
      name: 'قیمت‌ها',
      slug: 'ghimat-ha',
      description: 'قیمت‌های روزانه کالاها و خدمات',
      order: 22,
    },
    // دسته‌بندی‌های قدیمی (برای سازگاری)
    {
      name: 'اخبار روز اقتصادی',
      slug: 'ekhtesadi',
      description: 'آخرین اخبار و تحلیل‌های اقتصادی روز',
      order: 23,
    },
    {
      name: 'مسکن و شهرسازی',
      slug: 'maskan',
      description: 'اخبار و گزارش‌های مربوط به مسکن و شهرسازی',
      order: 24,
    },
    {
      name: 'راه‌های کشور',
      slug: 'rah',
      description: 'اخبار و اطلاعات مربوط به راه‌ها و حمل و نقل جاده‌ای',
      order: 25,
    },
    {
      name: 'بنادر و دریانوردی',
      slug: 'bandar',
      description: 'اخبار و گزارش‌های بنادر و دریانوردی',
      order: 26,
    },
    {
      name: 'قیمت روز',
      slug: 'ghimat',
      description: 'قیمت‌های روزانه کالاها و خدمات',
      order: 27,
    },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.blogCategory.create({
      data: {
        order: cat.order,
        is_active: true,
        translations: {
          create: {
            lang: 'FA',
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
          },
        },
      },
    });
    createdCategories.push(category);
  }

  // ایجاد منوها - فقط منوهای سایت خبری و پنل ادمین
  const menus = [
    // منوهای سایت
    {
      menukey: 'home',
      title: 'خانه',
      url: '/',
      icon: 'dashboard',
      order: 0,
      parentid: null,
    },
    {
      menukey: 'ekhtesadi',
      title: 'اخبار روز اقتصادی',
      url: '/category/ekhtesadi',
      icon: 'blog',
      order: 1,
      parentid: null,
    },
    {
      menukey: 'maskan',
      title: 'مسکن و شهرسازی',
      url: '/category/maskan',
      icon: 'blog',
      order: 2,
      parentid: null,
    },
    {
      menukey: 'rah',
      title: 'راه‌های کشور',
      url: '/category/rah',
      icon: 'blog',
      order: 3,
      parentid: null,
    },
    {
      menukey: 'bandar',
      title: 'بنادر و دریانوردی',
      url: '/category/bandar',
      icon: 'blog',
      order: 4,
      parentid: null,
    },
    {
      menukey: 'ghimat',
      title: 'قیمت روز',
      url: '/category/ghimat',
      icon: 'blog',
      order: 5,
      parentid: null,
    },
    // منوهای جدید بر اساس اقتصادآنلاین
    {
      menukey: 'eghtesad-iran',
      title: 'اقتصادایران',
      url: '/category/eghtesad-iran',
      icon: 'blog',
      order: 6,
      parentid: null,
    },
    {
      menukey: 'bourse',
      title: 'بورس',
      url: '/category/bourse',
      icon: 'blog',
      order: 7,
      parentid: null,
    },
    {
      menukey: 'tala-arz',
      title: 'طلا و ارز',
      url: '/category/tala-arz',
      icon: 'blog',
      order: 8,
      parentid: null,
    },
    {
      menukey: 'khodro',
      title: 'خودرو',
      url: '/category/khodro',
      icon: 'blog',
      order: 9,
      parentid: null,
    },
    {
      menukey: 'naft-energy',
      title: 'نفت و انرژی',
      url: '/category/naft-energy',
      icon: 'blog',
      order: 10,
      parentid: null,
    },
    {
      menukey: 'arz-digital',
      title: 'ارزدیجیتال',
      url: '/category/arz-digital',
      icon: 'blog',
      order: 11,
      parentid: null,
    },
    {
      menukey: 'siyasi',
      title: 'سیاسی',
      url: '/category/siyasi',
      icon: 'blog',
      order: 12,
      parentid: null,
    },
    // منوهای پنل ادمین
    {
      menukey: 'admin-dashboard',
      title: 'داشبورد',
      url: '/admin/dashboard',
      icon: 'dashboard',
      order: 0,
      parentid: null,
    },
    {
      menukey: 'admin-author-dashboard',
      title: 'داشبورد',
      url: '/admin/author-dashboard',
      icon: 'dashboard',
      order: 0,
      parentid: null,
    },
    {
      menukey: 'admin-blog',
      title: 'اخبار',
      url: null,
      icon: 'blog',
      order: 1,
      parentid: null,
    },
    {
      menukey: 'admin-comments',
      title: 'نظرات',
      url: '/admin/comments',
      icon: 'comments',
      order: 2,
      parentid: null,
    },
    {
      menukey: 'admin-ads',
      title: 'تبلیغات',
      url: '/admin/ads',
      icon: 'ads',
      order: 4,
      parentid: null,
    },
    {
      menukey: 'admin-rss',
      title: 'RSS',
      url: '/admin/rss-sync',
      icon: 'rss',
      order: 5,
      parentid: null,
    },
    {
      menukey: 'admin-settings',
      title: 'تنظیمات',
      url: null,
      icon: 'settings',
      order: 6,
      parentid: null,
    },
    {
      menukey: 'admin-price-ticker',
      title: 'تیکر قیمت',
      url: '/admin/setting/price-ticker',
      icon: 'trending_up',
      order: 10,
      parentid: null,
    },
  ];

  const createdMenus = [];
  for (const menu of menus) {
    const menuData = {
      menukey: menu.menukey,
      url: menu.url,
      icon: menu.icon,
      order: menu.order,
      is_active: true,
      target: '_self',
      translations: {
        create: {
          lang: 'FA',
          title: menu.title,
        },
      },
    };

    if (menu.parentid !== null) {
      menuData.parentid = menu.parentid;
    }

    const createdMenu = await prisma.menu.create({
      data: menuData,
    });
    createdMenus.push(createdMenu);
  }

  // ایجاد منوهای زیرمجموعه
  const blogMenu = createdMenus.find(m => m.menukey === 'admin-blog');
  const settingsMenu = createdMenus.find(m => m.menukey === 'admin-settings');
  
  if (blogMenu) {
    const blogSubMenus = [
      { menukey: 'admin-blog-list', title: 'لیست اخبار', url: '/admin/blog/bloglist', order: 0 },
      { menukey: 'admin-blog-add', title: 'افزودن خبر', url: '/admin/blog/addblog', order: 1 },
      { menukey: 'admin-blog-category', title: 'دسته‌بندی‌ها', url: '/admin/blog/category', order: 2 },
    ];
    
    for (const subMenu of blogSubMenus) {
      const created = await prisma.menu.create({
        data: {
          menukey: subMenu.menukey,
          url: subMenu.url,
          icon: null,
          order: subMenu.order,
          is_active: true,
          target: '_self',
          parentid: blogMenu.menuid,
          translations: {
            create: {
              lang: 'FA',
              title: subMenu.title,
            },
          },
        },
      });
      createdMenus.push(created);
    }
  }

  if (settingsMenu) {
    const settingsSubMenus = [
      { menukey: 'admin-settings-general', title: 'عمومی', url: '/admin/setting/general', order: 0, icon: 'settings' },
      { menukey: 'admin-settings-users', title: 'کاربران', url: '/admin/setting/users', order: 1, icon: 'users' },
      { menukey: 'admin-settings-permissions', title: 'دسترسی‌ها', url: '/admin/setting/permissions', order: 2, icon: 'permissions' },
      { menukey: 'admin-settings-ai', title: 'هوش مصنوعی', url: '/admin/setting/ai', order: 3, icon: 'ai' },
      { menukey: 'admin-settings-pages', title: 'صفحات استاتیک', url: '/admin/setting/pages', order: 4, icon: 'pages' },
      { menukey: 'admin-settings-social', title: 'شبکه‌های اجتماعی', url: '/admin/setting/social', order: 5, icon: 'social' },
      { menukey: 'admin-settings-design', title: 'طراحی', url: '/admin/setting/design', order: 6, icon: 'design' },
      { menukey: 'admin-settings-profile', title: 'پروفایل', url: '/admin/setting/profile', order: 7, icon: 'profile' },
      { menukey: 'admin-settings-metrics', title: 'متریک‌های سیستم', url: '/admin/setting/metrics', order: 8, icon: 'metrics' },
    ];
    
    for (const subMenu of settingsSubMenus) {
      const created = await prisma.menu.create({
        data: {
          menukey: subMenu.menukey,
          url: subMenu.url,
          icon: subMenu.icon,
          order: subMenu.order,
          is_active: true,
          target: '_self',
          parentid: settingsMenu.menuid,
          translations: {
            create: {
              lang: 'FA',
              title: subMenu.title,
            },
          },
        },
      });
      createdMenus.push(created);
    }
  }

  // ایجاد زیرمجموعه‌های منوی کاربران
  const usersMenu = await prisma.menu.findFirst({
    where: { menukey: 'admin-settings-users' },
  });

  if (usersMenu) {
    // بررسی وجود منوی نویسندگان
    const existingAuthorsMenu = await prisma.menu.findFirst({
      where: { menukey: 'admin-authors' },
    });

    if (!existingAuthorsMenu) {
      // ایجاد منوی نویسندگان به عنوان زیرمجموعه کاربران
      const authorsMenu = await prisma.menu.create({
        data: {
          menukey: 'admin-authors',
          url: '/admin/author',
          icon: 'authors',
          order: 0,
          is_active: true,
          target: '_self',
          parentid: usersMenu.menuid,
          translations: {
            create: {
              lang: 'FA',
              title: 'نویسندگان',
            },
          },
        },
      });
      createdMenus.push(authorsMenu);
      console.log('✅ منوی نویسندگان به عنوان زیرمجموعه کاربران ایجاد شد');
    } else {
      // اگر منوی نویسندگان از قبل وجود دارد، parentid آن را به کاربران تغییر می‌دهیم
      if (existingAuthorsMenu.parentid !== usersMenu.menuid) {
        await prisma.menu.update({
          where: { menukey: 'admin-authors' },
          data: {
            parentid: usersMenu.menuid,
            order: 0,
          },
        });
        console.log('✅ منوی نویسندگان به زیرمجموعه کاربران منتقل شد');
      }
    }
  }

  // بررسی و ایجاد منوی تیکر قیمت به صورت مستقل
  const existingPriceTickerMenu = await prisma.menu.findFirst({
    where: { menukey: 'admin-price-ticker' },
  });

  if (!existingPriceTickerMenu) {
    // ایجاد منوی تیکر قیمت به صورت مستقل
    const priceTickerMenu = await prisma.menu.create({
      data: {
        menukey: 'admin-price-ticker',
        url: '/admin/setting/price-ticker',
        icon: 'trending_up',
        order: 10,
        is_active: true,
        target: '_self',
        parentid: null,
        translations: {
          create: {
            lang: 'FA',
            title: 'تیکر قیمت',
          },
        },
      },
    });
    createdMenus.push(priceTickerMenu);
    console.log('✅ منوی تیکر قیمت به صورت مستقل ایجاد شد');
  } else {
    // اگر منوی تیکر قیمت از قبل وجود دارد، اطمینان از مستقل بودن آن
    if (existingPriceTickerMenu.parentid !== null) {
      await prisma.menu.update({
        where: { menukey: 'admin-price-ticker' },
        data: {
          parentid: null,
          order: 10,
          icon: 'trending_up',
        },
      });
      console.log('✅ منوی تیکر قیمت به صورت مستقل به‌روزرسانی شد');
    } else if (existingPriceTickerMenu.icon !== 'trending_up') {
      await prisma.menu.update({
        where: { menukey: 'admin-price-ticker' },
        data: {
          icon: 'trending_up',
        },
      });
      console.log('✅ آیکون trending_up برای منوی تیکر قیمت تنظیم شد');
    }
  }

  // دریافت تمام منوها (بعد از ایجاد زیرمجموعه‌ها)
  const allMenus = await prisma.menu.findMany();

  // ایجاد دسترسی منوها برای نقش‌ها
  for (const menu of allMenus) {
    // Admin - همه دسترسی‌ها به همه منوها (به جز admin-author-dashboard که فقط برای Author است)
    if (menu.menukey !== 'admin-author-dashboard') {
      // استفاده از upsert برای جلوگیری از خطای duplicate
      await prisma.roleMenuPermissions.upsert({
        where: {
          rolename_menukey: {
            rolename: 'Admin',
            menukey: menu.menukey,
          },
        },
        update: {
          canview: true,
          canedit: true,
          candelete: true,
        },
        create: {
          rolename: 'Admin',
          menukey: menu.menukey,
          canview: true,
          canedit: true,
          candelete: true,
        },
      });
    }

    // Editor - دسترسی به منوهای ادمین (بدون تنظیمات)
    if (menu.menukey.startsWith('admin-') && !menu.menukey.includes('settings')) {
      await prisma.roleMenuPermissions.create({
        data: {
          rolename: 'Editor',
          menukey: menu.menukey,
          canview: true,
          canedit: menu.menukey.includes('blog') || menu.menukey.includes('comments'),
          candelete: false,
        },
      });
    }

    // Author - دسترسی به داشبورد، اخبار، دسته‌بندی، نظرات و پروفایل
    const authorAllowedMenus = [
      'admin-author-dashboard', // داشبورد (فقط برای Author)
      'admin-blog',
      'admin-blog-list',
      'admin-blog-add',
      'admin-blog-category',
      'admin-comments',
      'admin-settings-profile',
    ];

    if (authorAllowedMenus.includes(menu.menukey)) {
      // تعیین سطح دسترسی بر اساس نوع منو
      let canedit = false;
      let candelete = false;

      if (menu.menukey === 'admin-blog-add' || menu.menukey === 'admin-blog-list' || menu.menukey === 'admin-settings-profile') {
        canedit = true;
      }

      if (menu.menukey === 'admin-blog-list' || menu.menukey === 'admin-comments') {
        candelete = true;
      }

      await prisma.roleMenuPermissions.upsert({
        where: {
          rolename_menukey: {
            rolename: 'Author',
            menukey: menu.menukey,
          },
        },
        update: {
          canview: true,
          canedit: canedit,
          candelete: candelete,
        },
        create: {
          rolename: 'Author',
          menukey: menu.menukey,
          canview: true,
          canedit: canedit,
          candelete: candelete,
        },
      });
    }
  }

  // ایجاد تنظیمات پیش‌فرض سایت
  await prisma.siteSetting.deleteMany();
  await prisma.siteSetting.createMany({
    data: [
      { key: 'site_name', value: 'سایت خبری', group_name: 'general' },
      { key: 'site_description', value: 'سایت خبری حرفه‌ای', group_name: 'general' },
      { key: 'site_url', value: 'https://example.com', group_name: 'general' },
      { key: 'site_email', value: 'info@example.com', group_name: 'general' },
      { key: 'site_phone', value: '', group_name: 'general' },
      { key: 'default_meta_title', value: 'سایت خبری', group_name: 'seo' },
      { key: 'default_meta_description', value: 'سایت خبری حرفه‌ای', group_name: 'seo' },
      { key: 'default_meta_keywords', value: 'خبر, اخبار, سایت خبری', group_name: 'seo' },
      { key: 'google_analytics_id', value: '', group_name: 'seo' },
      { key: 'google_search_console', value: '', group_name: 'seo' },
      { key: 'facebook_page', value: '', group_name: 'social' },
      { key: 'twitter_handle', value: '', group_name: 'social' },
      { key: 'instagram_handle', value: '', group_name: 'social' },
      { key: 'telegram_channel', value: '', group_name: 'social' },
    ],
  });

  // ایجاد تنظیمات اسلایدر
  await prisma.sliderConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      maxSlots: 5,
      backfillWindowHours: 48,
    },
  });

  // ایجاد صفحات استاتیک پیش‌فرض
  const aboutPageContent = `
    <h2>روزمرگی پرمخاطب‌ترین رسانه اقتصادی در ایران</h2>
    <p>گروه رسانه‌ای روزمرگی با نام ثبتی برآینداقتصادایرانیان از سال ۸۹ با مجوز نشریه برآینداقتصاد به شماره ۹۴۰۳۴ و پایگاه خبری روزمرگی به شماره ۷۴۳۳۴ از وزارت فرهنگ و ارشاد اسلامی آغاز به کار کرد و هم اکنون پرمخاطب‌ترین پایگاه خبری در حوزه اقتصاد محسوب می‌شود. این گروه رسانه‌ای زیر نظر مستقیم هیات عالی نظارت بر مطبوعات قرار دارد.</p>
    
    <h3>پایگاه خبری روزمرگی</h3>
    <p><strong>مدیر عامل گروه رسانه‌ای روزمرگی:</strong> محمدمهدی الحسینی</p>
    <p><strong>صاحب امتیاز:</strong> شرکت براینداقتصادایرانیان</p>
    <p><strong>مدیر مسئول:</strong> مریم کاظمی</p>
    <p><strong>شورای سیاستگذاری:</strong> علی مروی / صادق الحسینی</p>
    <p><strong>مدیر بازرگانی:</strong> علی یوسفی</p>
    <p><strong>سردبیر:</strong> حامد قربانی</p>
    
    <h3>روزمرگی در شبکه‌های مجازی:</h3>
    <ul>
      <li>صفحه رسمی روزمرگی در توییتر</li>
      <li>صفحه رسمی روزمرگی در اینستاگرام</li>
      <li>روزمرگی در تلگرام</li>
    </ul>
    
    <h3>آدرس دفتر:</h3>
    <p>یوسف آباد. میدان سلماس. خیابان فتحی شقاقی غربی. پلاک ۱۱۶. واحد ۱</p>
    <p><strong>تلفن دفتر مرکزی:</strong> ۱۳ و ۸۸۲۲۵۶۱۲ - ۸۶۰۹۳۶۲۸ - ۸۶۰۹۳۷۸۶</p>
    <p><strong>فکس:</strong> ۸۸۰۲۳۶۹۳</p>
  `;

  const contactPageContent = `
    <h2>ارتباط با ما</h2>
    <p>برای ارتباط با پایگاه خبری روزمرگی می‌توانید از طریق راه‌های زیر با ما در تماس باشید:</p>
    
    <h3>اطلاعات تماس</h3>
    <p><strong>آدرس دفتر:</strong> یوسف آباد. میدان سلماس. خیابان فتحی شقاقی غربی. پلاک ۱۱۶. واحد ۱</p>
    <p><strong>تلفن دفتر مرکزی:</strong> ۱۳ و ۸۸۲۲۵۶۱۲ - ۸۶۰۹۳۶۲۸ - ۸۶۰۹۳۷۸۶</p>
    <p><strong>فکس:</strong> ۸۸۰۲۳۶۹۳</p>
    
    <h3>برای درج آگهی</h3>
    <p>برای درج آگهی در پایگاه خبری روزمرگی با شماره <strong>۸۶۰۹۳۷۸۶</strong> تماس بگیرید یا به آدرس <strong>info@rozmaregi.com</strong> ایمیل بزنید.</p>
    
    <h3>برای درج آگهی ارز دیجیتال</h3>
    <p>برای درج آگهی ارز دیجیتال در پایگاه خبری روزمرگی با شماره <strong>۸۶۰۹۳۶۲۸</strong> تماس بگیرید.</p>
    
    <h3>شبکه‌های اجتماعی</h3>
    <ul>
      <li>صفحه رسمی روزمرگی در توییتر</li>
      <li>صفحه رسمی روزمرگی در اینستاگرام</li>
      <li>روزمرگی در تلگرام</li>
    </ul>
  `;

  // ایجاد صفحه درباره ما
  const aboutPage = await prisma.generalPage.upsert({
    where: { key: 'about' },
    update: {},
    create: {
      key: 'about',
      is_active: true,
      translations: {
        create: {
          lang: 'FA',
          title: 'درباره ما',
          content: aboutPageContent,
          slug: 'about',
        },
      },
    },
  });

  // ایجاد صفحه ارتباط با ما
  const contactPage = await prisma.generalPage.upsert({
    where: { key: 'contact' },
    update: {},
    create: {
      key: 'contact',
      is_active: true,
      translations: {
        create: {
          lang: 'FA',
          title: 'ارتباط با ما',
          content: contactPageContent,
          slug: 'contact',
        },
      },
    },
  });

  console.log(`✅ Seeding completed!`);
  console.log(`📧 Admin User 1: admin@news.com / admin123`);
  console.log(`📧 Admin User 2: kiabayat330@gmail.com / 12345`);
  console.log(`👤 Admin User IDs: ${adminUser.id}, ${kiaUser.id}`);
  console.log(`📁 Categories created: ${createdCategories.length}`);
  console.log(`📋 Total menus created: ${allMenus.length}`);
  console.log(`🗑️  Old menus and categories deleted`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
