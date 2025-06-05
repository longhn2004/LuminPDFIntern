"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import LanguageSwitch from '../LanguageSwitch';

interface AuthLayoutProps {
  children: React.ReactNode;
  rightWidthClass?: string;
  leftContent?: React.ReactNode;
}

export default function AuthLayout({
  children,
  rightWidthClass = "w-1/3",
  leftContent,
}: AuthLayoutProps) {
  const t = useTranslations();

  return (
    <div className="flex h-screen w-full bg-[url('/images/backgroundauth.png')] fixed bg-cover bg-center">
      {/* left div */}
      <div className="opacity-100 text-black absolute left-20 top-1/2 transform -translate-y-1/2 w-[300px] rounded-xl">
        <div className="w-full h-full rounded-xl">
          {leftContent || (
            <>
              <div className="flex items-center bg-white w-[130px] rounded-xl p-2">
                <Image src="/images/dsvlogo.png" alt="Logo" width={40} height={40} className="h-10 w-10" />
                <span className="text-xl font-bold text-black">DI-DSV</span>
              </div>
              <p className="text-white">{t('auth.companySlogan')}</p>
            </>
          )}
        </div>
      </div>
      
      {/* right div - form area */}
      <div className={`bg-white ${rightWidthClass} text-black absolute right-0 top-1/2 transform -translate-y-1/2 p-10 justify-center items-center flex flex-col h-full`}>
        {children}
      </div>
      
      {/* Language Switch aligned with DI-DSV section */}
      <div className="fixed bottom-6 left-20 z-10 bg-white rounded-lg px-3 py-2 border border-white/20">
        <LanguageSwitch variant="light" />
      </div>
    </div>
  );
} 