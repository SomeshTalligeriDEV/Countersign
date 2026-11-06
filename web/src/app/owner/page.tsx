import type { Metadata } from 'next';
import OwnerView from '@/components/countersign/OwnerView';
import EnsIdentity from '@/components/countersign/EnsIdentity';
export const metadata: Metadata = { title: 'Owner console', description: 'Create and manage an AI agent spending mandate: budget, per-payment cap, allowed merchants and World ID approval threshold.', alternates: { canonical: '/owner' } };
export default function OwnerPage(){return <><OwnerView/><div className="cs-comic mx-auto max-w-3xl px-6 pb-16"><EnsIdentity/></div></>;}
