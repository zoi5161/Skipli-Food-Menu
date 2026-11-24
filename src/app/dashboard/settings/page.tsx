import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { parseHours } from "@/lib/menu/hours";
import { requireRestaurant } from "@/lib/restaurant";
import { publicSiteUrl } from "@/lib/site-url";
import { SETTINGS_TABS, type SettingsData, type SettingsTab } from "./tabs";
import { SettingsEditor } from "./ui/settings-editor";

export const metadata: Metadata = { title: "Settings · Skipli Food Menu" };

async function SettingsContent({ searchParams }: { searchParams: PageProps<"/dashboard/settings">["searchParams"] }) {
  const [{ restaurant: r }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const tab = (SETTINGS_TABS as readonly string[]).includes(String(params.tab)) ? (params.tab as SettingsTab) : "general";
  const data: SettingsData = {
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    country: r.country,
    currency: r.currency,
    googleMapsUrl: r.googleMapsUrl,
    logoUrl: r.logoUrl,
    coverUrl: r.coverUrl,
    galleryUrls: r.galleryUrls,
    addressNote: r.addressNote,
    openingHours: parseHours(r.openingHours),
    timeZone: r.timeZone,
    addressLine: r.addressLine,
    city: r.city,
    region: r.region,
    postalCode: r.postalCode,
    isPublished: r.isPublished,
    accentColor: r.accentColor,
    menuStyle: r.menuStyle,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    inSitemap: r.inSitemap,
    customLinkLabel: r.customLinkLabel,
    customLinkUrl: r.customLinkUrl,
    phone: r.phone,
    whatsapp: r.whatsapp,
    contactEmail: r.contactEmail,
    showDirections: r.showDirections,
    primaryButton: r.primaryButton,
    secondaryButton: r.secondaryButton,
    publicHost: new URL(publicSiteUrl()).host,
  };
  return <SettingsEditor data={data} tab={tab} />;
}

export default function SettingsPage(props: PageProps<"/dashboard/settings">) {
  return (
    <Suspense fallback={<PageLoading label="Loading settings…" width="max-w-3xl" blocks={["h-9 w-40", "h-10 w-96 rounded-full", "h-80"]} />}>
      <SettingsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
