import { brands } from '@/data/brands'
import { phones } from '@/data/phones'
import type { Brand, Phone } from '@/data/types'

export const brandService = {
  async getBrands(): Promise<Brand[]> {
    return [...brands].sort((a, b) => (a.foundedYear ?? 0) - (b.foundedYear ?? 0))
  },

  async getBrandById(id: string): Promise<Brand | undefined> {
    return brands.find((b) => b.id === id)
  },

  async getBrandPhones(brand: Brand): Promise<Phone[]> {
    const byId = new Map(phones.map((p) => [p.id, p]))
    const featured = (brand.featuredPhones ?? [])
      .map((id) => byId.get(id))
      .filter((p): p is Phone => Boolean(p))
      .sort((a, b) => a.releaseYear - b.releaseYear)
    if (featured.length > 0) return featured
    return phones.filter((p) => p.brandId === brand.id).sort((a, b) => a.releaseYear - b.releaseYear)
  },

  async countPhones(brand: Brand): Promise<number> {
    return phones.filter((p) => p.brandId === brand.id).length
  },
}
