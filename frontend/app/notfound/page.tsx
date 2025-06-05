"use client"
import NotFoundPage from '@/components/NotFoundPage';
import { useAppTranslations } from '@/hooks/useTranslations';

export default function NotFoundPageRoute() {
  const translations = useAppTranslations();
  
  return <NotFoundPage
    message={translations.errors("pageNotFoundMessage")}
  />;
}
