import type { Metadata } from 'next';
import MerchantView from '@/components/countersign/MerchantView';
export const metadata: Metadata = { title: 'Merchant workspace', description: 'Countersign merchant registry and payments: USDT received from AI agents on Whitechain, refunds and receipts.', alternates: { canonical: '/merchant' } };
export default function MerchantPage(){return <MerchantView/>;}
