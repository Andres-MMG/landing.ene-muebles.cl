import type { Product } from "@/lib/strapi";
import { groupProductsBySubcategory, hasSubcategoryData } from "@/lib/product-groups";
import { ProductCard } from "./ProductCard";
import { SubcategoryNavigation } from "./SubcategoryNavigation";

type ProductSubcategoryGroupsProps = {
  products: Product[];
  whatsappNumber?: string;
};

/**
 * A paginated catalog page can only group the products currently shown.
 * The product count and pagination remain owned by the parent page.
 */
export function ProductSubcategoryGroups({
  products,
  whatsappNumber,
}: ProductSubcategoryGroupsProps) {
  const groups = groupProductsBySubcategory(products);
  const supportsGrouping = hasSubcategoryData(groups);

  if (!supportsGrouping) {
    return <ProductGrid products={products} whatsappNumber={whatsappNumber} />;
  }

  return (
    <div className="space-y-16 sm:space-y-20">
      <SubcategoryNavigation groups={groups} />

      {groups.map((group) => (
        <section
          key={group.id}
          id={group.id}
          tabIndex={-1}
          aria-labelledby={`${group.id}-heading`}
          className="scroll-mt-32"
        >
          <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-line pb-4 sm:mb-10">
            <h2 id={`${group.id}-heading`} className="t-h2 text-2xl text-ink sm:text-3xl">
              {group.name}
            </h2>
            <p className="t-overline text-ink-mute">
              {group.products.length} producto{group.products.length === 1 ? "" : "s"}
            </p>
          </header>
          <ProductGrid products={group.products} whatsappNumber={whatsappNumber} />
        </section>
      ))}
    </div>
  );
}

function ProductGrid({ products, whatsappNumber }: ProductSubcategoryGroupsProps) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-14 lg:grid-cols-3 lg:gap-y-16">
      {products.map((product) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} whatsappNumber={whatsappNumber} />
        </li>
      ))}
    </ul>
  );
}
