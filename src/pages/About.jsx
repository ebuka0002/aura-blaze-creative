import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SEO from '../components/SEO'
import model1 from '../assets/models/model1.jpg'
import model2 from '../assets/models/model2.jpg'
import model3 from '../assets/models/model3.jpg'
import model4 from '../assets/models/model4.jpg'
import model5 from '../assets/models/model5.jpg'
import model6 from '../assets/models/model6.jpg'
import abouthero from '../assets/models/about-hero.jpg'


const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

const carouselItems = [
  {
    title: 'Designed in Lagos',
    img: model1,
  },
  {
    title: 'Cut for the oversized silhouette',
    img: model2,
  },
  {
    title: 'Made to outlast the trend',
    img: model3,
  },
   {
    title: 'Made to outlast the trend',
    img: model4,
  },
   {
    title: 'Made to outlast the trend',
    img: model5,
  },
   {
    title: 'Made to outlast the trend',
    img: model6,
  },
]

export default function About() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [carouselWidth, setCarouselWidth] = useState(0)

  const carouselRef = useRef(null)

  // --------------------------------------------------
  // GET CAROUSEL WIDTH
  // --------------------------------------------------

  useEffect(() => {
    if (!carouselRef.current) return

    const updateWidth = () => {
      setCarouselWidth(carouselRef.current.offsetWidth)
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(carouselRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // --------------------------------------------------
  // SLIDE CONTROLS
  // --------------------------------------------------

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      Math.min(prev + 1, carouselItems.length - 1)
    )
  }

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      Math.max(prev - 1, 0)
    )
  }

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  // --------------------------------------------------
  // CURRENT TRANSLATION
  // --------------------------------------------------

  const currentX = -(currentIndex * carouselWidth)

  return (
    <div>
      <SEO
        title="About Us"
        description="The story behind Aura Blaze Creative — timeless, distinct, iconic streetwear designed in Lagos for Nigerian and international customers."
        path="/about"
      />

      {/* ==================================================
          HERO
      ================================================== */}

      <section className="relative h-[30vh] min-h-[200px] md:h-[60vh] md:min-h-[420px] bg-void text-bone overflow-hidden flex items-end">
        <img
          src= {abouthero}
          alt="Aura Blaze Creative studio"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />

        <div className="relative max-w-[1400px] mx-auto px-5 md:px-8 pb-10 md:pb-20">
          <p className="text-xs tracking-[0.3em] uppercase text-bone/70 mb-3">
            Our Story
          </p>

          <h1 className="font-display text-5xl md:text-8xl tracking-wide">
            About Us
          </h1>
        </div>
      </section>

      {/* ==================================================
          STORY
      ================================================== */}

      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{
          once: true,
          margin: '-100px',
        }}
        className="max-w-[800px] mx-auto px-5 md:px-8 py-20 md:py-28 text-center"
      >
        <h2 className="font-display text-3xl md:text-4xl tracking-wide mb-6">
          …embrace luxury with ease
        </h2>

        <p className="text-grey leading-relaxed text-[15px] md:text-base">
          Aura Blaze Creative started in Lagos with a rejection of noise. We build for the
          version of luxury that doesn't need a logo shouting across the chest — the version
          that shows up in the weight of the fabric, the cut of a sleeve, the way a jacket
          sits when you walk into a room. Every piece is designed to be worn for years, not
          seasons.
        </p>

        <p className="text-grey leading-relaxed text-[15px] md:text-base mt-5">
          We work in small batches, sourcing heavyweight cotton and running each drop through
          fittings before it ever reaches a customer. Timeless. Distinct. Iconic. — that's not
          a tagline we picked, it's the standard we hold every piece to before it ships.
        </p>
      </motion.section>

      {/* ==================================================
          IMAGE CAROUSEL
      ================================================== */}

      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{
          once: true,
          margin: '-100px',
        }}
        className="pb-20 md:pb-28 overflow-hidden"
      >
        <div className="relative max-w-[1400px] mx-auto px-5 md:px-8">

          {/* CAROUSEL WINDOW */}

          <div
            ref={carouselRef}
            className="
              relative
              overflow-hidden
              rounded-[24px]
              h-[480px]
              sm:h-[540px]
              md:h-[680px]
              touch-pan-y
              select-none
            "
          >

            {/* SLIDING TRACK */}

            <motion.div
              className="flex h-full"
              drag="x"
              dragConstraints={{
                left:
                  carouselWidth > 0
                    ? -(carouselItems.length - 1) *
                      carouselWidth
                    : 0,
                right: 0,
              }}
              dragElastic={0.08}
              dragMomentum={false}
              animate={{
                x: currentX,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 35,
                mass: 0.8,
              }}
              onDragEnd={(event, info) => {
                const offset = info.offset.x
                const velocity = info.velocity.x

                const swipeDistance = carouselWidth * 0.18

                // Swipe left
                if (
                  (offset < -swipeDistance ||
                    velocity < -500) &&
                  currentIndex <
                    carouselItems.length - 1
                ) {
                  setCurrentIndex((prev) => prev + 1)
                  return
                }

                // Swipe right
                if (
                  (offset > swipeDistance ||
                    velocity > 500) &&
                  currentIndex > 0
                ) {
                  setCurrentIndex((prev) => prev - 1)
                  return
                }

                // Not enough movement:
                // snap back to current image
                setCurrentIndex((prev) => prev)
              }}
            >
              {carouselItems.map((item) => (
                <div
                  key={item.title}
                  className="
                    relative
                    shrink-0
                    w-full
                    h-full
                    overflow-hidden
                  "
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    draggable="false"
                    className="
                      w-full
                      h-full
                      object-cover
                      pointer-events-none
                    "
                  />

                  {/* DARK OVERLAY */}

                  <div className="absolute inset-0 bg-void/10 pointer-events-none" />

                  {/* TITLE */}

                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-void/70 to-transparent pointer-events-none">
                    <p className="text-bone text-xl md:text-3xl font-display tracking-wide">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ==================================================
                PREVIOUS BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={prevSlide}
              disabled={currentIndex === 0}
              aria-label="Previous image"
              className="
                absolute
                left-3
                md:left-5
                top-1/2
                -translate-y-1/2
                w-12
                h-12
                md:w-14
                md:h-14
                rounded-full
                bg-void/80
                text-bone
                flex
                items-center
                justify-center
                hover:bg-void
                transition-all
                duration-200
                z-20
                disabled:opacity-30
                disabled:cursor-not-allowed
              "
            >
              <ChevronLeft size={28} />
            </button>

            {/* ==================================================
                NEXT BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={nextSlide}
              disabled={
                currentIndex ===
                carouselItems.length - 1
              }
              aria-label="Next image"
              className="
                absolute
                right-3
                md:right-5
                top-1/2
                -translate-y-1/2
                w-12
                h-12
                md:w-14
                md:h-14
                rounded-full
                bg-void/80
                text-bone
                flex
                items-center
                justify-center
                hover:bg-void
                transition-all
                duration-200
                z-20
                disabled:opacity-30
                disabled:cursor-not-allowed
              "
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* ==================================================
              DOTS
          ================================================== */}

          <div className="flex justify-center items-center gap-2 mt-6">
            {carouselItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`
                  h-1.5
                  rounded-full
                  transition-all
                  duration-300
                  ${
                    index === currentIndex
                      ? 'w-8 bg-void'
                      : 'w-1.5 bg-void/30'
                  }
                `}
              />
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  )
}