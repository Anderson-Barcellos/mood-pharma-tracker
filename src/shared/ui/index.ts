/**
 * UI Components Index
 *
 * Centralized exports for all UI components.
 * Import from "@/shared/ui" instead of individual files.
 */

// Glassmorphism Components
export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardAction,
  GlassCardDescription,
  GlassCardContent,
  glassCardVariants,
  type GlassCardProps,
} from "./glass-card"

export {
  GlassPanel,
  GlassPanelHeader,
  GlassPanelContent,
  GlassPanelFooter,
  glassPanelVariants,
  type GlassPanelProps,
} from "./glass-panel"

export {
  GradientBackground,
  GradientContainer,
  gradientBackgroundVariants,
  type GradientBackgroundProps,
  type GradientContainerProps,
} from "./gradient-bg"

// Standard Components (legacy)
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card"

export { Button, buttonVariants } from "./button"
export { Calendar } from "./calendar"
export { Checkbox } from "./checkbox"
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./select"

export { Separator } from "./separator"
export { Label } from "./label"
export { Input } from "./input"
export { Textarea } from "./textarea"
export { Switch } from "./switch"
export { Slider } from "./slider"
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs"
export { Badge } from "./badge"
export { Avatar, AvatarImage, AvatarFallback } from "./avatar"
export { Skeleton } from "./skeleton"
export { Progress } from "./progress"
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip"
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor
} from "./popover"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./dropdown-menu"

export {
  Alert,
  AlertTitle,
  AlertDescription,
} from "./alert"

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog"

export { AspectRatio } from "./aspect-ratio"
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "./accordion"

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from "./breadcrumb"

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "./carousel"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from "./chart"

export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./collapsible"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./command"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "./context-menu"

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./drawer"

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
} from "./form"

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./hover-card"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "./input-otp"

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
} from "./menubar"

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from "./navigation-menu"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination"

export { RadioGroup, RadioGroupItem } from "./radio-group"

export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./resizable"

export { ScrollArea, ScrollBar } from "./scroll-area"

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./sidebar"

export { Toaster } from "./sonner"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table"

export { Toggle, toggleVariants } from "./toggle"
export { ToggleGroup, ToggleGroupItem } from "./toggle-group"
