import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable experimental features for better performance

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Disable Next.js dev server request logging
  logging: {
    fetches: {
      fullUrl: false,
    },
    // Disable incoming request logging (GET, POST, etc.)
    // This will suppress logs like: GET /api/admin/blog/generation-progress 200 in 10ms
    incomingRequests: false,
  },

  // Turbopack configuration (for dev mode) - Next.js 16.1.1 optimizations
  // Turbopack is much faster than Webpack for development
  turbopack: {
    // Optimize module resolution for faster compilation
    resolveAlias: {
      // Add any custom aliases here if needed
    },
  },

  // Source maps configuration
  // In Next.js 16, source maps are disabled in production by default
  // In dev mode, source maps are handled by Turbopack automatically

  // Suppress source map warnings in development
  // کاهش مصرف RAM در dev mode با محدود کردن cache صفحات
  // Next.js 16.1.1: Optimized for faster compilation and lower memory usage
  onDemandEntries: {
    maxInactiveAge: 15 * 1000, // کاهش به 15 ثانیه برای آزاد شدن سریع‌تر حافظه
    pagesBufferLength: 1, // کاهش به 1 صفحه برای مصرف کمتر RAM
  },

  // Next.js 16.1.1: Faster compilation with optimized source maps
  // Use faster source map generation in dev mode
  productionBrowserSourceMaps: false, // Disable in production for faster builds

  // Webpack optimizations (for production build)
  webpack(config, { isServer, dev }) {
    // SVG handling with @svgr/webpack
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Suppress source map warnings in development
    // Next.js 16.1.1: Optimized source maps for faster compilation
    if (dev) {
      // Use fastest source map generation for dev mode
      config.devtool = 'eval-cheap-module-source-map';

      // Optimize module resolution for faster compilation
      config.resolve = {
        ...config.resolve,
        // Cache module resolution for faster rebuilds
        cache: true,
        // Optimize symlinks
        symlinks: false,
      };

      // Suppress source map warnings from node_modules
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Failed to parse source map/,
        /Invalid source map/,
        /sourceMapURL could not be parsed/,
        // Suppress warnings about overly broad file patterns in public/uploads
        // These are runtime paths in API routes, not static imports
        /The file pattern.*matches.*files/,
        /Overly broad patterns/,
      ];

      // Optimize cache for faster rebuilds with memory limits
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // محدود کردن cache size برای کاهش مصرف RAM
        maxMemoryGenerations: 1, // فقط 1 generation در حافظه نگه دار
        maxAge: 1000 * 60 * 60 * 24, // 24 ساعت
      };
    }

    // Exclude scripts folder from bundling
    // This prevents Next.js from trying to bundle external scripts during build
    // Note: Turbopack handles this differently, so we use dynamic imports in the code

    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Split chunks optimization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunks
          mui: {
            name: 'mui',
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          apexcharts: {
            name: 'apexcharts',
            test: /[\\/]node_modules[\\/](apexcharts|react-apexcharts)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'www.pishkhan.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pishkhan.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'preview.sprukomarket.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.mehrnews.com',
        pathname: '/**',
      },
    ],
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Output configuration
  output: 'standalone',

  // Enable experimental features for better performance
  // Next.js 16.1.1: Enhanced optimizePackageImports
  // This significantly reduces bundle size and compilation time
  experimental: {
    // optimizePackageImports removed to rule out experimental issues
    // Note: instrumentationHook is enabled by default in Next.js 16+
    // No need to explicitly set it - instrumentation.ts will work automatically

    // Next.js 16.1.1: Optimize CSS imports
    optimizeCss: false, // Disabled due to RangeError during build

    // Next.js 16.1.1: Server Actions optimization
    serverActions: {
      bodySizeLimit: '2mb', // Limit server action body size
    },
  },

  // Exclude large directories from output file tracing to avoid build performance issues
  // Next.js 16.1.1: Enhanced file tracing exclusions for faster builds
  // These files are handled dynamically at runtime in API routes, not at build time
  outputFileTracingExcludes: {
    '*': [
      'public/uploads/**/*',
      'public/uploads',
      'public/images/**/*',
      'public/fonts/**/*',
      'script/**/*',
      'models/**/*',
      'AI water mark/**/*',
      'docs/**/*',
      'node_modules/@swc',
      'node_modules/webpack',
      'node_modules/.cache',
    ],
  },

  // Next.js 16.1.1: Optimize build output
  // Reduce build time by excluding unnecessary files
  outputFileTracingIncludes: {
    '*': [],
  },

  // Rewrite برای تبدیل مسیر /اخبار/ به /news/
  // Note: This is handled by proxy.ts first, but kept here as fallback
  // In Next.js 16.1.1, proxy takes precedence over rewrites
  async rewrites() {
    return [
      {
        source: '/اخبار/:slug*',
        destination: '/news/:slug*',
      },
      // برای route روزنامه - اگر نیاز باشد می‌توانیم rewrite اضافه کنیم
    ];
  },
};

export default nextConfig;
