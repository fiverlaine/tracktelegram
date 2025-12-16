"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 750,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    const isGoingToDark = !isDark
    
    // @ts-ignore - View Transitions API
    if (!document.startViewTransition) {
        const newTheme = !isDark
        setIsDark(newTheme)
        document.documentElement.classList.toggle("dark")
        localStorage.setItem("theme", newTheme ? "dark" : "light")
        return
    }

    // Set attribute for CSS z-index layering
    document.documentElement.setAttribute("data-theme-transition", isGoingToDark ? "to-dark" : "to-light");

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        const newTheme = !isDark
        setIsDark(newTheme)
        document.documentElement.classList.toggle("dark")
        localStorage.setItem("theme", newTheme ? "dark" : "light")
      })
    })

    await transition.ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    // Determines which Pseudo Element to animate and in which direction
    // Logic: Always animate the "Dark" layer.
    // If to-dark: Animate NEW (Dark) from 0 to 100%.
    // If to-light: Animate OLD (Dark) from 100% to 0%.
    
    const pseudoElement = isGoingToDark
        ? "::view-transition-new(root)"
        : "::view-transition-old(root)"
    
    const clipPath = isGoingToDark
        ? [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`]
        : [`circle(${maxRadius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`]

    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: pseudoElement,
      }
    )
    
    // Cleanup attribute after transition
    transition.finished.finally(() => {
        document.documentElement.removeAttribute("data-theme-transition");
    });
    
  }, [isDark, duration])

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(className)}
      {...props}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
