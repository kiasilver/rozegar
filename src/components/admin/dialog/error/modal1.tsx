'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function Modal({ isOpen, onClose, onConfirm }: ModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-10 rtl">
      <DialogBackdrop transition />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start text-right flex flex-row-reverse">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon aria-hidden="true" className="size-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle as="h3" className="text-base font-semibold text-gray-900 text-right">
                    حذف بلاگ‌ها
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 text-right">
                      آیا مطمئن هستید که می‌خواهید این موارد را حذف کنید؟ این عملیات برگشت‌ناپذیر است.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-4">
              <button
                type="button"
                onClick={onConfirm} // استفاده از onConfirm که به تابع حذف متصل است
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 sm:ml-3 sm:w-auto"
              >
                تایید حذف
              </button>
              <button
                type="button"
                data-autofocus
                onClick={onClose} // بستن مودال در صورت لغو
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                لغو
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
