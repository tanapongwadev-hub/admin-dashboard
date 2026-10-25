import { redirect } from 'next/navigation';

// BOM work moved to /engineering/setup; old links keep working.
export default function Page() {
  redirect('/engineering/setup');
}
