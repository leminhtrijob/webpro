import React from 'react';
import { notFound } from 'next/navigation';
import { AVAILABLE_TEMPLATES } from '@/data/availableTemplates';
import ConfiguratorStudio from '@/components/studio/ConfiguratorStudio';

export function generateStaticParams() {
  return AVAILABLE_TEMPLATES.map((t) => ({
    slug: t.slug
  }));
}

interface StudioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { slug } = await params;
  const template = AVAILABLE_TEMPLATES.find((t) => t.slug === slug);

  if (!template) {
    notFound();
  }

  return <ConfiguratorStudio template={template} />;
}
