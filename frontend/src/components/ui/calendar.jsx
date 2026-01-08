import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <>
      <style>{`
        /* Calendar table styling - ensure equal column widths */
        .rdp-calendar table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
        
        /* Force equal width for all header and data cells */
        .rdp-calendar thead tr th,
        .rdp-calendar tbody tr td {
          width: 14.285714%; /* 100% / 7 = 14.285714% */
          min-width: 0;
          text-align: center;
          vertical-align: middle;
        }
        
        /* Header cells */
        .rdp-calendar thead tr th {
          padding: 0.5rem 0.25rem;
          font-size: 0.75rem;
          line-height: 1.5;
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
        }
        
        /* Data cells */
        .rdp-calendar tbody tr td {
          padding: 0;
          position: relative;
          display: table-cell;
        }
        
        /* Ensure cells don't wrap */
        .rdp-calendar thead tr th {
          word-wrap: normal;
          overflow-wrap: normal;
        }
        
        /* Responsive sizing */
        @media (min-width: 640px) {
          .rdp-calendar thead tr th {
            padding: 0.5rem;
            font-size: 0.875rem;
          }
        }
        
        /* Small screens - reduce padding */
        @media (max-width: 639px) {
          .rdp-calendar thead tr th {
            padding: 0.375rem 0.125rem;
            font-size: 0.6875rem;
          }
          
          .rdp-calendar tbody tr td {
            padding: 0.125rem;
          }
        }
      `}</style>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-2 sm:p-3 rdp-calendar", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-2 sm:space-y-4 w-full",
          caption: "flex justify-center pt-1 relative items-center px-1",
          caption_label: "text-xs sm:text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-6 w-6 sm:h-7 sm:w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-xs"
          ),
          nav_button_previous: "absolute left-0 sm:left-1",
          nav_button_next: "absolute right-0 sm:right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "",
          head_cell:
            "text-muted-foreground rounded-md font-normal",
          row: "mt-1 sm:mt-2",
          cell: cn(
            "text-xs sm:text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-7 w-7 sm:h-8 sm:w-8 p-0 font-normal aria-selected:opacity-100 text-xs sm:text-sm mx-auto"
          ),
          day_range_start: "day-range-start",
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
        }}
        {...props} />
    </>
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
