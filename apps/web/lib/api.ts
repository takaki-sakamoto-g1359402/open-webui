const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getDashboard() {
  const res = await fetch(`${API_URL}/dashboard`, { cache: 'no-store' });
  return res.json();
}

export async function getCountry(iso3: string) {
  const res = await fetch(`${API_URL}/countries/${iso3}`, { cache: 'no-store' });
  return res.json();
}

export async function getSources() {
  const res = await fetch(`${API_URL}/sources`, { cache: 'no-store' });
  return res.json();
}
