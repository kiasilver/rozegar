"use client";
import React, { useState } from "react";
import Label from "@/components/Admin/form/Label";
import Input from "@/components/Admin/form/input/InputField";
import TextArea from "@/components/Admin/form/input/TextArea";
import RichTextEditor from "@/components/Admin/form/richtext/LexicalEditor";
import Button from "@/components/Admin/ui/button/Button";
import { useAlert } from "@/context/Admin/AlertContext";

interface AboutUsData {
  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  heroDescription: string;

  // About Section
  aboutTitle: string;
  aboutContent: string;
  aboutImage?: string;

  // Mission & Vision
  missionTitle: string;
  missionContent: string;
  visionTitle: string;
  visionContent: string;

  // Values
  valuesTitle: string;
  values: Array<{ title: string; description: string; icon?: string }>;

  // Team Section
  teamTitle: string;
  teamMembers: Array<{
    name: string;
    position: string;
    bio: string;
    image?: string;
    social?: { linkedin?: string; twitter?: string; email?: string };
  }>;

  // Stats Section
  statsTitle: string;
  stats: Array<{ label: string; value: string; icon?: string }>;

  // Contact Info
  contactTitle: string;
  address: string;
  phone: string;
  email: string;
  workingHours: string;
}

interface AboutUsTemplateProps {
  initialData?: Partial<AboutUsData>;
  onSave: (data: AboutUsData) => Promise<void>;
  loading?: boolean;
}

export default function AboutUsTemplate({
  initialData,
  onSave,
  loading = false,
}: AboutUsTemplateProps) {
  const { showAlert } = useAlert();
  const [activeSection, setActiveSection] = useState<string>("hero");

  const [data, setData] = useState<AboutUsData>({
    heroTitle: initialData?.heroTitle || "درباره ما",
    heroSubtitle: initialData?.heroSubtitle || "ما کی هستیم؟",
    heroDescription: initialData?.heroDescription || "",
    aboutTitle: initialData?.aboutTitle || "داستان ما",
    aboutContent: initialData?.aboutContent || "",
    missionTitle: initialData?.missionTitle || "ماموریت ما",
    missionContent: initialData?.missionContent || "",
    visionTitle: initialData?.visionTitle || "چشم‌انداز ما",
    visionContent: initialData?.visionContent || "",
    valuesTitle: initialData?.valuesTitle || "ارزش‌های ما",
    values: initialData?.values || [
      { title: "", description: "" },
      { title: "", description: "" },
      { title: "", description: "" },
    ],
    teamTitle: initialData?.teamTitle || "تیم ما",
    teamMembers: initialData?.teamMembers || [
      { name: "", position: "", bio: "" },
    ],
    statsTitle: initialData?.statsTitle || "آمار و ارقام",
    stats: initialData?.stats || [
      { label: "", value: "" },
      { label: "", value: "" },
      { label: "", value: "" },
      { label: "", value: "" },
    ],
    contactTitle: initialData?.contactTitle || "تماس با ما",
    address: initialData?.address || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    workingHours: initialData?.workingHours || "",
  });

  const updateData = (field: keyof AboutUsData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateValue = (index: number, field: "title" | "description", value: string) => {
    const newValues = [...data.values];
    newValues[index] = { ...newValues[index], [field]: value };
    updateData("values", newValues);
  };

  const addValue = () => {
    updateData("values", [...data.values, { title: "", description: "" }]);
  };

  const removeValue = (index: number) => {
    if (data.values.length > 1) {
      updateData(
        "values",
        data.values.filter((_, i) => i !== index)
      );
    }
  };

  const updateTeamMember = (
    index: number,
    field: keyof AboutUsData["teamMembers"][0],
    value: any
  ) => {
    const newMembers = [...data.teamMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    updateData("teamMembers", newMembers);
  };

  const addTeamMember = () => {
    updateData("teamMembers", [
      ...data.teamMembers,
      { name: "", position: "", bio: "" },
    ]);
  };

  const removeTeamMember = (index: number) => {
    if (data.teamMembers.length > 1) {
      updateData(
        "teamMembers",
        data.teamMembers.filter((_, i) => i !== index)
      );
    }
  };

  const updateStat = (index: number, field: "label" | "value", value: string) => {
    const newStats = [...data.stats];
    newStats[index] = { ...newStats[index], [field]: value };
    updateData("stats", newStats);
  };

  const addStat = () => {
    updateData("stats", [...data.stats, { label: "", value: "" }]);
  };

  const removeStat = (index: number) => {
    if (data.stats.length > 1) {
      updateData(
        "stats",
        data.stats.filter((_, i) => i !== index)
      );
    }
  };

  const handleSave = async () => {
    try {
      await onSave(data);
      showAlert("تغییرات با موفقیت ذخیره شد", "success");
    } catch (error) {
      showAlert("خطا در ذخیره تغییرات", "error");
    }
  };

  const sections = [
    { id: "hero", label: "بخش Hero", icon: "🎯" },
    { id: "about", label: "درباره ما", icon: "📖" },
    { id: "mission", label: "ماموریت و چشم‌انداز", icon: "🎯" },
    { id: "values", label: "ارزش‌ها", icon: "💎" },
    { id: "team", label: "تیم", icon: "👥" },
    { id: "stats", label: "آمار", icon: "📊" },
    { id: "contact", label: "اطلاعات تماس", icon: "📞" },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      {activeSection === "hero" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            بخش Hero
          </h2>
          <div>
            <Label>عنوان اصلی</Label>
            <Input
              value={data.heroTitle}
              onChange={(e) => updateData("heroTitle", e.target.value)}
              placeholder="مثال: درباره ما"
            />
          </div>
          <div>
            <Label>زیرعنوان</Label>
            <Input
              value={data.heroSubtitle}
              onChange={(e) => updateData("heroSubtitle", e.target.value)}
              placeholder="مثال: ما کی هستیم؟"
            />
          </div>
          <div>
            <Label>توضیحات Hero</Label>
            <TextArea
              value={data.heroDescription}
              onChange={(e) => updateData("heroDescription", e.target.value)}
              rows={4}
              placeholder="توضیحات کوتاه برای بخش Hero..."
            />
          </div>
          <div>
            <Label>آدرس تصویر Hero (اختیاری)</Label>
            <Input
              value={data.heroImage || ""}
              onChange={(e) => updateData("heroImage", e.target.value)}
              placeholder="/images/hero-about.jpg"
            />
          </div>
        </div>
      )}

      {/* About Section */}
      {activeSection === "about" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            بخش درباره ما
          </h2>
          <div>
            <Label>عنوان</Label>
            <Input
              value={data.aboutTitle}
              onChange={(e) => updateData("aboutTitle", e.target.value)}
              placeholder="مثال: داستان ما"
            />
          </div>
          <div>
            <Label>محتوای درباره ما</Label>
            <RichTextEditor
              value={data.aboutContent}
              onChange={(content) => updateData("aboutContent", content)}
            />
          </div>
          <div>
            <Label>آدرس تصویر (اختیاری)</Label>
            <Input
              value={data.aboutImage || ""}
              onChange={(e) => updateData("aboutImage", e.target.value)}
              placeholder="/images/about-us.jpg"
            />
          </div>
        </div>
      )}

      {/* Mission & Vision */}
      {activeSection === "mission" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            ماموریت و چشم‌انداز
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                ماموریت
              </h3>
              <div>
                <Label>عنوان ماموریت</Label>
                <Input
                  value={data.missionTitle}
                  onChange={(e) => updateData("missionTitle", e.target.value)}
                  placeholder="ماموریت ما"
                />
              </div>
              <div>
                <Label>توضیحات ماموریت</Label>
                <TextArea
                  value={data.missionContent}
                  onChange={(e) => updateData("missionContent", e.target.value)}
                  rows={6}
                  placeholder="ماموریت سازمان خود را شرح دهید..."
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                چشم‌انداز
              </h3>
              <div>
                <Label>عنوان چشم‌انداز</Label>
                <Input
                  value={data.visionTitle}
                  onChange={(e) => updateData("visionTitle", e.target.value)}
                  placeholder="چشم‌انداز ما"
                />
              </div>
              <div>
                <Label>توضیحات چشم‌انداز</Label>
                <TextArea
                  value={data.visionContent}
                  onChange={(e) => updateData("visionContent", e.target.value)}
                  rows={6}
                  placeholder="چشم‌انداز سازمان خود را شرح دهید..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Values */}
      {activeSection === "values" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              ارزش‌های ما
            </h2>
            <Button onClick={addValue} type="button" variant="outline">
              + افزودن ارزش
            </Button>
          </div>
          <div>
            <Label>عنوان بخش</Label>
            <Input
              value={data.valuesTitle}
              onChange={(e) => updateData("valuesTitle", e.target.value)}
              placeholder="ارزش‌های ما"
            />
          </div>
          <div className="space-y-4">
            {data.values.map((value, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    ارزش {index + 1}
                  </h3>
                  {data.values.length > 1 && (
                    <Button
                      onClick={() => removeValue(index)}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      حذف
                    </Button>
                  )}
                </div>
                <div>
                  <Label>عنوان</Label>
                  <Input
                    value={value.title}
                    onChange={(e) => updateValue(index, "title", e.target.value)}
                    placeholder="مثال: شفافیت"
                  />
                </div>
                <div>
                  <Label>توضیحات</Label>
                  <TextArea
                    value={value.description}
                    onChange={(e) =>
                      updateValue(index, "description", e.target.value)
                    }
                    rows={3}
                    placeholder="توضیحات ارزش..."
                  />
                </div>
                <div>
                  <Label>آیکون (اختیاری)</Label>
                  <Input
                    value={value.icon || ""}
                    onChange={(e) => {
                      const newValues = [...data.values];
                      newValues[index] = { ...newValues[index], icon: e.target.value };
                      updateData("values", newValues);
                    }}
                    placeholder="مثال: 💎"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {activeSection === "team" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              تیم ما
            </h2>
            <Button onClick={addTeamMember} type="button" variant="outline">
              + افزودن عضو تیم
            </Button>
          </div>
          <div>
            <Label>عنوان بخش</Label>
            <Input
              value={data.teamTitle}
              onChange={(e) => updateData("teamTitle", e.target.value)}
              placeholder="تیم ما"
            />
          </div>
          <div className="space-y-6">
            {data.teamMembers.map((member, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    عضو تیم {index + 1}
                  </h3>
                  {data.teamMembers.length > 1 && (
                    <Button
                      onClick={() => removeTeamMember(index)}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      حذف
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>نام</Label>
                    <Input
                      value={member.name}
                      onChange={(e) =>
                        updateTeamMember(index, "name", e.target.value)
                      }
                      placeholder="نام کامل"
                    />
                  </div>
                  <div>
                    <Label>سمت</Label>
                    <Input
                      value={member.position}
                      onChange={(e) =>
                        updateTeamMember(index, "position", e.target.value)
                      }
                      placeholder="مثال: مدیر عامل"
                    />
                  </div>
                </div>
                <div>
                  <Label>بیوگرافی</Label>
                  <TextArea
                    value={member.bio}
                    onChange={(e) =>
                      updateTeamMember(index, "bio", e.target.value)
                    }
                    rows={4}
                    placeholder="توضیحات کوتاه درباره عضو تیم..."
                  />
                </div>
                <div>
                  <Label>آدرس تصویر (اختیاری)</Label>
                  <Input
                    value={member.image || ""}
                    onChange={(e) =>
                      updateTeamMember(index, "image", e.target.value)
                    }
                    placeholder="/images/team/member.jpg"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {activeSection === "stats" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              آمار و ارقام
            </h2>
            <Button onClick={addStat} type="button" variant="outline">
              + افزودن آمار
            </Button>
          </div>
          <div>
            <Label>عنوان بخش</Label>
            <Input
              value={data.statsTitle}
              onChange={(e) => updateData("statsTitle", e.target.value)}
              placeholder="آمار و ارقام"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.stats.map((stat, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                    آمار {index + 1}
                  </h3>
                  {data.stats.length > 1 && (
                    <Button
                      onClick={() => removeStat(index)}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      حذف
                    </Button>
                  )}
                </div>
                <div>
                  <Label>برچسب</Label>
                  <Input
                    value={stat.label}
                    onChange={(e) => updateStat(index, "label", e.target.value)}
                    placeholder="مثال: مشتریان راضی"
                  />
                </div>
                <div>
                  <Label>مقدار</Label>
                  <Input
                    value={stat.value}
                    onChange={(e) => updateStat(index, "value", e.target.value)}
                    placeholder="مثال: 1000+"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {activeSection === "contact" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            اطلاعات تماس
          </h2>
          <div>
            <Label>عنوان بخش</Label>
            <Input
              value={data.contactTitle}
              onChange={(e) => updateData("contactTitle", e.target.value)}
              placeholder="تماس با ما"
            />
          </div>
          <div>
            <Label>آدرس</Label>
            <TextArea
              value={data.address}
              onChange={(e) => updateData("address", e.target.value)}
              rows={3}
              placeholder="آدرس کامل دفتر..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>تلفن</Label>
              <Input
                value={data.phone}
                onChange={(e) => updateData("phone", e.target.value)}
                placeholder="021-12345678"
              />
            </div>
            <div>
              <Label>ایمیل</Label>
              <Input
                type="email"
                value={data.email}
                onChange={(e) => updateData("email", e.target.value)}
                placeholder="info@example.com"
              />
            </div>
          </div>
          <div>
            <Label>ساعات کاری</Label>
            <Input
              value={data.workingHours}
              onChange={(e) => updateData("workingHours", e.target.value)}
              placeholder="شنبه تا چهارشنبه: 9 صبح تا 6 عصر"
            />
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "در حال ذخیره..." : "ذخیره تمام تغییرات"}
        </Button>
      </div>
    </div>
  );
}

