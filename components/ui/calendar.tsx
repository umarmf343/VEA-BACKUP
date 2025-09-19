"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { ButtonProps } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /**
   * Controls which button variant is used for the navigation controls.
   * Defaults to the "ghost" variant to keep parity with the previous design.
   */
  navButtonVariant?: ButtonProps["variant"]
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  navButtonVariant = "ghost",
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: navButtonVariant, size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell:
          "relative h-9 w-9 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-outside)]:bg-accent [&:has([aria-selected].day-outside)]:text-muted-foreground",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: (iconProps) => <ChevronLeft className="h-4 w-4" {...iconProps} />,
        IconRight: (iconProps) => <ChevronRight className="h-4 w-4" {...iconProps} />,
        ...components,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
