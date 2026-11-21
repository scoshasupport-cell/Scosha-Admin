/** Shared public contact details for Scosha storefront. */
export const SCOSHA_CONTACT = {
  email: "scosha.support@gmail.com",
  phoneDisplay: "+961 81 428 503",
  whatsappDisplay: "+961 81 428 503",
  whatsappE164: "96181428503",
  whatsappUrl: "https://wa.me/message/XO72WXVTPGZGL1",
  instagram: "https://www.instagram.com/scosha.lb",
  facebook: "https://www.facebook.com/share/1aJYKZbcoN/",
  get mailto() {
    return `mailto:${this.email}`
  },
  get telHref() {
    return `tel:+${this.whatsappE164}`
  },
} as const
