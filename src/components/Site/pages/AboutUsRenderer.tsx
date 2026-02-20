"use client";
import React from "react";
import Image from "next/image";

interface AboutUsData {
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  heroDescription: string;
  aboutTitle: string;
  aboutContent: string;
  aboutImage?: string;
  missionTitle: string;
  missionContent: string;
  visionTitle: string;
  visionContent: string;
  valuesTitle: string;
  values: Array<{ title: string; description: string; icon?: string }>;
  teamTitle: string;
  teamMembers: Array<{
    name: string;
    position: string;
    bio: string;
    image?: string;
    social?: { linkedin?: string; twitter?: string; email?: string };
  }>;
  statsTitle: string;
  stats: Array<{ label: string; value: string; icon?: string }>;
  contactTitle: string;
  address: string;
  phone: string;
  email: string;
  workingHours: string;
}

interface AboutUsRendererProps {
  data: AboutUsData;
}

export default function AboutUsRenderer({ data }: AboutUsRendererProps) {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              {data.heroTitle || "درباره ما"}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-100 mb-4 sm:mb-6">
              {data.heroSubtitle || "ما کی هستیم؟"}
            </p>
            {data.heroDescription && (
              <p className="text-sm sm:text-base md:text-lg text-blue-50 max-w-3xl mx-auto px-2 sm:px-0">
                {data.heroDescription}
              </p>
            )}
          </div>
          {data.heroImage && (
            <div className="mt-8 sm:mt-10 md:mt-12 flex justify-center">
              <div className="relative w-full max-w-4xl h-48 sm:h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={data.heroImage}
                  alt={data.heroTitle}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="py-8 sm:py-12 md:py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                {data.aboutTitle || "داستان ما"}
              </h2>
              {data.aboutContent && (
                <div
                  className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: data.aboutContent }}
                />
              )}
            </div>
            {data.aboutImage && (
              <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden shadow-xl">
                <Image
                  src={data.aboutImage}
                  alt={data.aboutTitle}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      {(data.missionContent || data.visionContent) && (
        <section className="py-8 sm:py-12 md:py-16 bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {data.missionContent && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    {data.missionTitle || "ماموریت ما"}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {data.missionContent}
                  </p>
                </div>
              )}
              {data.visionContent && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    {data.visionTitle || "چشم‌انداز ما"}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {data.visionContent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      {data.values && data.values.length > 0 && data.values.some(v => v.title) && (
        <section className="py-8 sm:py-12 md:py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6 sm:mb-8 md:mb-12">
              {data.valuesTitle || "ارزش‌های ما"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {data.values
                .filter((v) => v.title)
                .map((value, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 md:p-6 text-center"
                  >
                    {value.icon && (
                      <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{value.icon}</div>
                    )}
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                      {value.description}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      {data.stats && data.stats.length > 0 && data.stats.some(s => s.label) && (
        <section className="py-8 sm:py-12 md:py-16 bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">
              {data.statsTitle || "آمار و ارقام"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {data.stats
                .filter((s) => s.label)
                .map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm md:text-base text-blue-100">{stat.label}</div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {data.teamMembers && data.teamMembers.length > 0 && data.teamMembers.some(m => m.name) && (
        <section className="py-8 sm:py-12 md:py-16 bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6 sm:mb-8 md:mb-12">
              {data.teamTitle || "تیم ما"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {data.teamMembers
                .filter((m) => m.name)
                .map((member, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden text-center"
                  >
                    {member.image && (
                      <div className="relative w-full h-48 sm:h-56 md:h-64">
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 sm:p-5 md:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {member.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 mb-3 sm:mb-4 text-sm sm:text-base">
                        {member.position}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {member.bio}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Info */}
      {(data.address || data.phone || data.email || data.workingHours) && (
        <section className="py-8 sm:py-12 md:py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6 sm:mb-8 md:mb-12">
              {data.contactTitle || "تماس با ما"}
            </h2>
            <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {data.address && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 md:p-6">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    آدرس
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    {data.address}
                  </p>
                </div>
              )}
              {data.phone && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 md:p-6">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    تلفن
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{data.phone}</p>
                </div>
              )}
              {data.email && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 md:p-6">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    ایمیل
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-all">{data.email}</p>
                </div>
              )}
              {data.workingHours && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-5 md:p-6">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                    ساعات کاری
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    {data.workingHours}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

