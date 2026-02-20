"use client";
import React, { useState, useEffect } from "react";
import Input from "@/components/Admin/form/input/InputField";
import Button from "@/components/Admin/ui/button/Button";
import Label from "@/components/Admin/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons/Admin";
import { InputOtp, Form } from "@heroui/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function SignUpForm() {
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
    setError('');
    setSuccess('');
  
    const isPhone = /^0\d{10}$/.test(inputValue);
    const isEmail = /\S+@\S+\.\S+/.test(inputValue);
  
    if (!isPhone && !isEmail) {
      alert("ورودی نامعتبر است");
      return;
    }
  
    try {
      if (isPhone) {

        const response = await fetch('/api/v1/admin/auth/register/check-phone', {
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
          return;
        }
        setStep('otp');
        setPhone(inputValue);
   
        } 
        if (isEmail) {
          const response = await fetch('/api/v1/admin/auth/register/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inputValue }),
          });
        
          const data = await response.json();
        
          if (!response.ok) {
            setError(data.message || 'ایمیل قبلاً ثبت شده است');
            return;
          }
        
          setEmail(inputValue);
          setStep('password');
        }
        
  
    } catch (err) {
      console.error('❌ خطا در ارتباط:', err);
      setError('ارتباط با سرور برقرار نشد');
    }
  };
  





  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
  
    try {
      const response = await fetch('/api/v1/admin/auth/register/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("📡 Response:", data);
      if (!response.ok) {
        setError(data.message || 'رمز عبور اشتباه است');
        return;
      }
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('❌ خطا:', err);
      setError('ارتباط با سرور برقرار نشد');
    }
    
  };
  
  
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (otp.length !== 4) {
      setError('کد باید ۴ رقمی باشد');
      return;
    }
  
    try {
      const response = await fetch('/api/v1/admin/auth/validate-otp/register/', {
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
        return;
      }
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('خطا در بررسی OTP:', error);
      setError('مشکلی در ارتباط با سرور پیش آمده');
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
      
      <Button size="sm" className="w-full" >
         تایید
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
          type="password"
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)} // بررسی کن که مقدار درست گرفته میشه

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
        <Button className="w-full">
        ثبت نام
        </Button>
  
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
          <Button className="w-full" size="sm">
           ثبت نام
          </Button>
        </div>
        <div className="mt-5">
          <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
            ثبت نام کردی؟{" "}
            <Link
              href="/admin/signin"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              ورود
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
           ثبت نام
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
