"use client";
import { useEffect } from 'react';

export default function MetaDescription() {
  useEffect(() => {
    // دریافت meta description از API
    fetch('/api/v1/public/footer')
      .then((res) => res.json())
      .then((data) => {
        if (data.metaDescription) {
          // به‌روزرسانی meta description
          let metaDescription = document.querySelector('meta[name="description"]');
          if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
          }
          metaDescription.setAttribute('content', data.metaDescription);
        }
      })
      .catch((error) => {
        console.error('Error fetching meta description:', error);
      });
  }, []);

  return null;
}

