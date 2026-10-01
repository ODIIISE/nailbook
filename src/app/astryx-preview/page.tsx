// Stock Astryx `product-gallery` page template (npx astryx template product-gallery),
// with Persian nail-studio content. No custom CSS/HTML beyond the template's own
// image-fill style; theme is the stock neutral theme; RTL comes from the i18n
// provider (fa → rtl) plus the app's existing <html dir="rtl">.

'use client';

import {useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import {AppShell} from '@astryxdesign/core/AppShell';
import {neutralTheme} from '@/themes/neutral/neutralTheme';
import {VStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Card} from '@astryxdesign/core/Card';
import {Icon} from '@astryxdesign/core/Icon';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {ArrowRightIcon} from '@heroicons/react/24/outline';
import type {CSSProperties} from 'react';

// ─── Styles (from the stock template) ───────────────────────────────────────
// The only custom CSS is the image fill — there is no Image primitive to
// fill the AspectRatio box with `object-fit` (#2582).

const image: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

// ─── Service Data ───────────────────────────────────────────────────────────

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

const SERVICES: Service[] = [
  {
    id: 1,
    name: 'مانیکور اسپانیایی',
    description: 'ناخن‌های تمیز و مرتب با لاک مات ماندگار و آب‌بندی کامل.',
    price: 450000,
    image:
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f5f6f8%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23c2cad6%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23c2cad6%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  },
  {
    id: 2,
    name: 'ژلیش رنگی',
    description: 'پوشش ژلی براق تا چهار هفته، بدون ترک و پریدگی.',
    price: 680000,
    image:
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f5f6f8%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23c2cad6%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23c2cad6%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  },
  {
    id: 3,
    name: 'فرنچ کلاسیک',
    description: 'خط سفید ظریف روی بستر طبیعی؛ مناسب هر موقعیتی.',
    price: 520000,
    image:
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f5f6f8%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23c2cad6%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23c2cad6%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  },
  {
    id: 4,
    name: 'پک‌ژل ترمیمی',
    description: 'بازسازی ناخن‌های آسیب‌دیده با ژل و فرم‌دهی مجدد.',
    price: 750000,
    image:
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f5f6f8%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23c2cad6%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23c2cad6%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  },
  {
    id: 5,
    name: 'پدیکور اسپا',
    description: 'لایه‌برداری، ماساژ و لاک‌آب برای پاهای خسته.',
    price: 550000,
    image:
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f5f6f8%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23c2cad6%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23c2cad6%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  },
  {
    id: 6,
    name: 'کوتاهی و مرتب‌سازی',
    description: 'فرم‌دهی و پرداخت ساده برای حفظ سلامت ناخن.',
    price: 200000,
    image:
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f5f6f8%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23c2cad6%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23c2cad6%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  },
];

const fmt = (n: number) => `${n.toLocaleString('fa-IR')} تومان`;

// ─── Service Card ───────────────────────────────────────────────────────────

function ServiceCard({service}: {service: Service}) {
  return (
    <VStack gap={3}>
      <Card padding={0}>
        <AspectRatio ratio={1}>
          <img src={service.image} alt={service.name} style={image} />
        </AspectRatio>
      </Card>
      <VStack gap={1}>
        <Heading level={2}>{service.name}</Heading>
        <Text type="body" color="secondary" maxLines={2}>
          {service.description}
        </Text>
        <Text type="large" weight="bold">
          {fmt(service.price)}
        </Text>
      </VStack>
    </VStack>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AstryxPreviewPage() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  return (
    <InternationalizationProvider locale="fa">
      <Theme theme={neutralTheme} mode={mode}>
        {/* AppShell paints the themed canvas (stock root frame); Layout centers
            the template's content width inside it. */}
        <AppShell height="auto" contentPadding={0}>
          <Layout
          height="fill"
          contentWidth={1200}
          content={
            <LayoutContent padding={6}>
              <VStack gap={6}>
                {/* روشن/تاریک — light is the default */}
                <VStack gap={2} hAlign="start">
                  <SegmentedControl
                    value={mode}
                    onChange={(v) => setMode(v as 'light' | 'dark')}
                    label="حالت روشن یا تاریک"
                  >
                    <SegmentedControlItem value="light" label="روشن" />
                    <SegmentedControlItem value="dark" label="تاریک" />
                  </SegmentedControl>
                </VStack>

                {/* Header — Grid handles responsive stacking */}
                <Grid columns={{minWidth: 280}} gap={4} align="start">
                  <Heading level={1}>
                    هر روزتان با ناخن‌هایی مرتب و زیبا شروع شود.
                  </Heading>
                  <VStack gap={3} hAlign="start">
                    <Text type="body">
                      استودیوی ما با ابزار استریل، لاک‌های بی‌ضرر و وقت‌های
                      مشخص، مراقبت از ناخن را ساده و قابل اعتماد می‌کند. نوبتتان
                      را همین‌جا رزرو کنید؛ بدون تماس تلفنی اضافه.
                    </Text>
                    <Button
                      label="رزرو نوبت"
                      variant="primary"
                      endContent={<Icon icon={ArrowRightIcon} color="inherit" />}
                    />
                  </VStack>
                </Grid>

                {/* Service Grid — reflows 3 → 2 → 1 columns as width narrows */}
                <Grid columns={{minWidth: 300}} gap={6}>
                  {SERVICES.map(service => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </Grid>
              </VStack>
            </LayoutContent>
          }
          />
        </AppShell>
      </Theme>
    </InternationalizationProvider>
  );
}
