import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMAD, formatMADFull } from "@/lib/moroccan-utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
}

export const CurrencyDisplay = ({ amount, className }: CurrencyDisplayProps) => {
  const abbreviated = formatMAD(amount);
  const full = formatMADFull(amount);

  // Only show tooltip if the number is abbreviated (different from full)
  const needsTooltip = abbreviated !== full;

  if (needsTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={className} style={{ cursor: 'help' }}>
              {abbreviated}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{full}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className={className} title={full}>{abbreviated}</span>;
};
