"use client"

import { FormEvent, useState } from "react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { SCOSHA_CONTACT } from "@/lib/contact"

export default function ContactPage() {
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    try {
      await api.post("/contact", {
        name: String(fd.get("name") || ""),
        email: String(fd.get("email") || ""),
        phone: String(fd.get("phone") || "") || undefined,
        subject: String(fd.get("orderNumber") || "")
          ? `Order ${fd.get("orderNumber")}`
          : "Storefront contact",
        message: String(fd.get("message") || ""),
      })
      toast.success("Message sent — we will get back to you soon")
      e.currentTarget.reset()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send message")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="store-container py-8 md:py-12">
      <div className="grid gap-12 lg:grid-cols-2">
        <form className="space-y-4" onSubmit={onSubmit}>
          <h2 className="text-[28px] font-bold">E-Mail Us</h2>
          <input
            name="name"
            required
            className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
            placeholder="Name"
          />
          <input
            name="email"
            required
            className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
            placeholder="Email"
            type="email"
          />
          <input
            name="phone"
            className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
            placeholder="Phone Number"
          />
          <input
            name="orderNumber"
            className="h-12 w-full rounded-full bg-[#ededed] px-5 text-[15px] outline-none"
            placeholder="Order Number"
          />
          <textarea
            name="message"
            required
            className="min-h-32 w-full rounded-[10px] bg-[#ededed] px-5 py-4 text-[15px] outline-none"
            placeholder="Your message"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-[10px] bg-brand px-8 text-[15px] font-semibold uppercase text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Sending…" : "Submit now"}
          </button>
        </form>
        <div className="space-y-6">
          <div>
            <h3 className="text-[22px] font-bold">Need Help?</h3>
            <p className="mt-2 text-[15px] text-[#666]">
              Do you need support? Our team is available to answer your questions and offer
              styling advice.
            </p>
          </div>
          <div>
            <h3 className="text-[22px] font-bold">General Office</h3>
            <p className="mt-2 text-[15px] text-[#666]">
              Ramaco Center, Level 1, Mirna Chalouhi Road, Sed Bouchrieh, Mount Lebanon
            </p>
          </div>
          <div>
            <h3 className="text-[22px] font-bold">Phone number</h3>
            <p className="mt-2 text-[15px] text-[#666]">
              <a href={SCOSHA_CONTACT.telHref} className="hover:text-brand">
                {SCOSHA_CONTACT.phoneDisplay}
              </a>
            </p>
            <p className="mt-1 text-[14px] text-[#666]">
              <a
                href={SCOSHA_CONTACT.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand"
              >
                WhatsApp {SCOSHA_CONTACT.whatsappDisplay}
              </a>
            </p>
          </div>
          <div>
            <h3 className="text-[22px] font-bold">Email</h3>
            <p className="mt-2 text-[15px] text-[#666]">
              <a href={SCOSHA_CONTACT.mailto} className="hover:text-brand">
                {SCOSHA_CONTACT.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
