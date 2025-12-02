import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface CategoryGridProps {
    title: string;
    categories: { id: string; name: string; image_url?: string | null }[];
}

export default function CategoryGrid({ title, categories }: CategoryGridProps) {
    // Ensure we always have 4 items to fill the grid, even if placeholders needed
    const displayCategories = categories.slice(0, 4);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">{title}</h3>

            <div className="grid grid-cols-2 gap-4 flex-1">
                {displayCategories.map((cat) => (
                    <Link
                        key={cat.id}
                        to={`/products?category=${encodeURIComponent(cat.name)}`}
                        className="group flex flex-col gap-1"
                    >
                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                            {cat.image_url ? (
                                <img
                                    src={cat.image_url}
                                    alt={cat.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                    {cat.name[0]}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary truncate">
                            {cat.name}
                        </span>
                    </Link>
                ))}
            </div>

            <Link to="/categories" className="mt-4 text-sm text-blue-600 hover:underline hover:text-red-600 flex items-center">
                See more <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
        </div>
    );
}
