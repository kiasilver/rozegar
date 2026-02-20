"use client";
import React, { useState, useEffect } from "react";
import Input from "@/components/Admin/form/input/InputField";
import Button from "@/components/Admin/ui/button/Button";
import Label from "@/components/Admin/form/Label";
import { InputOtp, Form } from "@heroui/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from 'next/navigation';

// Eye icons as inline SVG components
const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92328 9.70241C4.86804 7.26761 7.23361 5.54297 10.0002 5.54297C12.7667 5.54297 15.1323 7.26762 16.0771 9.70243C15.1323 12.1372 12.7667 13.8619 10.0002 13.8619ZM10.0002 4.04297C6.48191 4.04297 3.49489 6.30917 2.4155 9.4593C2.3615 9.61687 2.3615 9.78794 2.41549 9.94552C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C13.5184 15.3619 16.5055 13.0957 17.5849 9.94555C17.6389 9.78797 17.6389 9.6169 17.5849 9.45932C16.5055 6.30919 13.5184 4.04297 10.0002 4.04297ZM9.99151 7.84413C8.96527 7.84413 8.13333 8.67606 8.13333 9.70231C8.13333 10.7286 8.96527 11.5605 9.99151 11.5605H10.0064C11.0326 11.5605 11.8646 10.7286 11.8646 9.70231C11.8646 8.67606 11.0326 7.84413 10.0064 7.84413H9.99151Z"
    />
  </svg>
);

const EyeCloseIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.63803 3.57709C4.34513 3.2842 3.87026 3.2842 3.57737 3.57709C3.28447 3.86999 3.28447 4.34486 3.57737 4.63775L4.85323 5.91362C3.74609 6.84199 2.89363 8.06395 2.4155 9.45936C2.3615 9.61694 2.3615 9.78801 2.41549 9.94558C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C11.255 15.3619 12.4422 15.0737 13.4994 14.5598L15.3625 16.4229C15.6554 16.7158 16.1302 16.7158 16.4231 16.4229C16.716 16.13 16.716 15.6551 16.4231 15.3622L4.63803 3.57709ZM12.3608 13.4212L10.4475 11.5079C10.3061 11.5423 10.1584 11.5606 10.0064 11.5606H9.99151C8.96527 11.5606 8.13333 10.7286 8.13333 9.70237C8.13333 9.5461 8.15262 9.39434 8.18895 9.24933L5.91885 6.97923C5.03505 7.69015 4.34057 8.62704 3.92328 9.70247C4.86803 12.1373 7.23361 13.8619 10.0002 13.8619C10.8326 13.8619 11.6287 13.7058 12.3608 13.4212ZM16.0771 9.70249C15.7843 10.4569 15.3552 11.1432 14.8199 11.7311L15.8813 12.7925C16.6329 11.9813 17.2187 11.0143 17.5849 9.94561C17.6389 9.78803 17.6389 9.61696 17.5849 9.45938C16.5055 6.30925 13.5184 4.04303 10.0002 4.04303C9.13525 4.04303 8.30244 4.17999 7.52218 4.43338L8.75139 5.66259C9.1556 5.58413 9.57311 5.54303 10.0002 5.54303C12.7667 5.54303 15.1323 7.26768 16.0771 9.70249Z"
    />
  </svg>
);

export default function SignInForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"input" | "otp" | "password">("input");
  const [otp, setOtp] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
  
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);


  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setError('');
    setSuccess('');
    setLoading(true);
  
    const isPhone = /^0\d{10}$/.test(inputValue);
    const isEmail = /\S+@\S+\.\S+/.test(inputValue);
  
    if (!isPhone && !isEmail) {
      setError("لطفاً ایمیل یا شماره موبایل معتبر وارد کنید");
      setLoading(false);
      return;
    }
  
    try {
      if (isPhone) {
        const response = await fetch('/api/v1/admin/auth/login/check-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            step: "otp",
            phone: inputValue
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "دوباره سعی کنید");
          setLoading(false);
          return;
        }
        setStep('otp');
        setPhone(inputValue);
        setLoading(false);
        return;
      }

      if (isEmail) {
        const response = await fetch('/api/v1/admin/auth/login/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inputValue }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'ایمیل یافت نشد');
          setLoading(false);
          return;
        }

        setEmail(inputValue);
        setStep('password');
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ خطا در ارتباط:', err);
      setError('ارتباط با سرور برقرار نشد');
      setLoading(false);
    }
  };




  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!password || password.trim() === '') {
      setError('لطفاً رمز عبور را وارد کنید');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);
  
    try {
      const response = await fetch('/api/v1/admin/auth/login/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setError(data.message || 'رمز عبور اشتباه است');
        setLoading(false);
        return;
      }

      setSuccess('ورود موفقیت‌آمیز');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 500);
    } catch (err) {
      console.error('❌ خطا:', err);
      setError('ارتباط با سرور برقرار نشد');
      setLoading(false);
    }
  };
  
  
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!otp || otp.length !== 4) {
      setError('لطفاً کد ۴ رقمی را کامل وارد کنید');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/admin/auth/validate-otp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp,
        }),
      });
      
      const data = await response.json();
  
      if (!response.ok) {
        setError(data.message || 'کد وارد شده نامعتبر است');
        setLoading(false);
        return;
      }

      setSuccess('ورود موفقیت‌آمیز');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 500);
    } catch (error) {
      console.error('خطا در بررسی OTP:', error);
      setError('مشکلی در ارتباط با سرور پیش آمده');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
  
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
  
    try {
      const response = await fetch('/api/v1/admin/auth/login/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'otp',
          phone,
          otp: newOtp,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setError(data.message || 'مشکلی پیش آمده');
        return;
      }
  
      setSuccess('کد جدید ارسال شد');
      setOtp(''); // خالی کردن فیلد OTP
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      console.error('خطا در ارسال مجدد:', err);
      setError('مشکلی در ارسال مجدد کد پیش آمد');
    }
  };
  
  
  
 

  const otpForm = (
    <motion.div
      key="otp"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
    >
      <Form
        onSubmit={handleOtpSubmit}
        className="flex w-full flex-col items-start gap-4"
      >
        <Label>کد تأیید</Label>
        <InputOtp
        value={otp}
        onValueChange={(value: string) => setOtp(value)}
        errorMessage="کد را وارد کنید"
        className="custom-otp"
        size="lg"
        fullWidth
        autoFocus
        variant="bordered"
        isRequired
        aria-label="OTP input field"
        length={4}
        name="otp"
        placeholder="کد را وارد کنید"
      />
      
      <Button 
        type="submit"
        size="sm" 
        className="w-full"
        disabled={loading}
      >
        {loading ? 'در حال بررسی...' : 'تایید'}
      </Button>
     
      </Form>
      <div className="mt-5">
            <button
        type="button"
        onClick={handleResendOtp}
        disabled={!canResend}
        className={`mt-4 ${canResend ? 'btn-primary' : 'opacity-50 cursor-not-allowed'}`}
      >
        {canResend ? 'ارسال مجدد کد' : `ارسال مجدد تا ${resendTimer} ثانیه دیگر`}
      </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
    </motion.div>
  );

  const passwordForm = (
    <motion.div className="w-full"
      key="password"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
    >
      <Form
        onSubmit={handlePasswordSubmit}
        className="flex flex-col gap-4 w-full"
      >
        <Label>رمز عبور</Label>
        <div className="relative w-full">
        <Input 
          type={showPassword ? "text" : "password"}
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handlePasswordSubmit(e as any);
            }
          }}
        />
        <span
          onClick={() => setShowPassword(!showPassword)}
          className="absolute z-30 -translate-y-1/2 cursor-pointer left-4 top-1/2"
        >
          {showPassword ? (
            <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
          ) : (
            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
          )}
        </span>
        </div>
        <Button 
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </Button>
        <div className="mt-5">
          <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
            رمز عبور خود را فراموش کردید؟{" "}
            <Link
              href="/signup"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              بازیابی
            </Link>
          </p>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </Form>
    </motion.div>
  );

  const initialForm = (
    <motion.div
      key="initial"
      initial={{ opacity: 1, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
    >
      <Form onSubmit={handleInitialSubmit} className="w-full space-y-6">
        <div className="w-full">
          <Label className="py-4">
            ایمیل ، نام کاربری یا موبایل <span className="text-error-500">*</span>
          </Label>
          <Input
            type="text"
           value={inputValue}
           onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <div className="w-full">
          <Button 
            type="submit"
            className="w-full" 
            size="sm"
            disabled={loading}
          >
            {loading ? 'در حال بررسی...' : 'ورود'}
          </Button>
        </div>
        <div className="mt-5">
          <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
            ثبت نام نکردی؟{" "}
            <Link
              href="/admin/signup"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              ثبت نام
            </Link>
          </p>
          
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        </div>
        
      </Form>
    </motion.div>
  );

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="w-full max-w-md sm:pt-5 mx-auto mb-5">
      <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = "/";
          }}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          برگشت به صفحه قبلی
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto min-w-[400px]">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md text-center">
            ورود به پنل
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "input" && initialForm}
          {step === "otp" && otpForm}
          {step === "password" && passwordForm}
        </AnimatePresence>

       
      </div>
    </div>
  );
}
