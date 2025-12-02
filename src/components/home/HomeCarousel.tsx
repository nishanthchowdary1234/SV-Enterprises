import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function HomeCarousel() {
    const slides = [
        {
            id: 1,
            image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop",
            title: "Premium Sanitary Solutions",
            description: "Upgrade your home with our top-tier plumbing fixtures.",
            cta: "Shop Now",
            link: "/products"
        },
        {
            id: 2,
            image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=2070&auto=format&fit=crop",
            title: "Industrial Grade Pipes",
            description: "Durable CPVC and UPVC pipes for all your construction needs.",
            cta: "View Catalog",
            link: "/categories"
        },
        {
            id: 3,
            image: "https://images.unsplash.com/photo-1620626012053-93f2685048d6?q=80&w=2070&auto=format&fit=crop",
            title: "Modern Bathroom Fittings",
            description: "Elegant designs that blend style with functionality.",
            cta: "Explore Deals",
            link: "/products?category=fittings"
        }
    ]

    return (
        <div className="relative w-full bg-gray-100 dark:bg-gray-900">
            <Carousel className="w-full" opts={{ loop: true }}>
                <CarouselContent>
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id}>
                            <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden">
                                {/* Background Image with Overlay */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${slide.image})` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                                </div>

                                {/* Content */}
                                <div className="relative container h-full flex flex-col justify-center text-white px-4 md:px-12 pb-12">
                                    <h2 className="text-3xl md:text-5xl font-bold mb-4 max-w-xl leading-tight">
                                        {slide.title}
                                    </h2>
                                    <p className="text-lg md:text-xl mb-8 max-w-lg text-gray-200">
                                        {slide.description}
                                    </p>
                                    <Button size="lg" className="w-fit bg-primary hover:bg-primary/90 text-white border-none font-semibold" asChild>
                                        <Link to={slide.link}>{slide.cta}</Link>
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
            </Carousel>

            {/* Bottom Gradient Fade for seamless transition to next section */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
        </div>
    )
}
