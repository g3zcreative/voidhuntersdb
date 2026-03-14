import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface DropdownItem {
  label: string;
  href: string;
  iconUrl?: string | null;
  active?: boolean;
}

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  /** If provided, hovering this segment shows a dropdown of related items */
  dropdown?: DropdownItem[];
}

interface DatabaseBreadcrumbProps {
  segments: BreadcrumbSegment[];
}

function SegmentWithDropdown({
  segment,
  isLast,
}: {
  segment: BreadcrumbSegment;
  isLast: boolean;
}) {
  const hasDropdown = segment.dropdown && segment.dropdown.length > 0;

  const linkContent = (
    <span className="inline-flex items-center gap-1">
      {segment.label}
      {hasDropdown && (
        <ChevronDown className="h-3 w-3 opacity-50" />
      )}
    </span>
  );

  if (!hasDropdown) {
    if (isLast) {
      return <BreadcrumbPage>{segment.label}</BreadcrumbPage>;
    }
    return (
      <BreadcrumbLink asChild>
        <Link to={segment.href || "#"}>{segment.label}</Link>
      </BreadcrumbLink>
    );
  }

  return (
    <HoverCard openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild>
        {isLast ? (
          <BreadcrumbPage className="cursor-pointer">
            {linkContent}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link to={segment.href || "#"}>{linkContent}</Link>
          </BreadcrumbLink>
        )}
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-56 p-1"
        sideOffset={8}
      >
        <ScrollArea className="max-h-72">
          <div className="flex flex-col">
            {segment.dropdown!.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  item.active && "bg-accent/50 font-medium text-accent-foreground"
                )}
              >
                {item.iconUrl && (
                  <img
                    src={item.iconUrl}
                    alt=""
                    className="h-4 w-4 object-contain flex-shrink-0"
                  />
                )}
                <span className={cn(!item.iconUrl && "pl-0")}>{item.label}</span>
                {item.active && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </Link>
            ))}
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
}

export function DatabaseBreadcrumb({ segments }: DatabaseBreadcrumbProps) {
  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/database">Database</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, i) => (
          <span key={i} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <SegmentWithDropdown
                segment={segment}
                isLast={i === segments.length - 1}
              />
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
