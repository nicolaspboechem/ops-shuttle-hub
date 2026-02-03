import { useState, useMemo } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  MessageCircle, 
  Search, 
  X,
  Phone,
  Clock,
  ExternalLink
} from 'lucide-react';
import { faqByRole, roleLabels, type FAQRole, type FAQSection } from '@/lib/data/faqData';
import { SUPPORT_CONFIG } from '@/lib/data/supportConfig';

interface HelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: FAQRole;
}

export function HelpDrawer({ open, onOpenChange, role }: HelpDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const faqSections = faqByRole[role] || [];
  
  // Filter FAQ items based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return faqSections;
    
    const query = searchQuery.toLowerCase();
    
    return faqSections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query) ||
          item.keywords.some(kw => kw.toLowerCase().includes(query))
        )
      }))
      .filter(section => section.items.length > 0);
  }, [faqSections, searchQuery]);

  const totalResults = filteredSections.reduce((acc, s) => acc + s.items.length, 0);

  const handleWhatsAppClick = () => {
    window.open(SUPPORT_CONFIG.getWhatsAppUrl(roleLabels[role]), '_blank');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <DrawerTitle>Central de Ajuda</DrawerTitle>
            </div>
            <Badge variant="secondary">{roleLabels[role]}</Badge>
          </div>
          <DrawerDescription>
            Encontre respostas para suas dúvidas
          </DrawerDescription>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ajuda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              {totalResults} resultado(s) encontrado(s)
            </p>
          )}
        </DrawerHeader>
        
        <ScrollArea className="flex-1 px-4 max-h-[50vh]">
          {filteredSections.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum resultado encontrado</p>
              <p className="text-sm">Tente outros termos ou fale conosco</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2 py-4">
              {filteredSections.map((section) => (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-2">
                    <section.icon className="h-4 w-4" />
                    <span>{section.title}</span>
                  </div>
                  
                  {section.items.map((item) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="border rounded-lg px-3"
                    >
                      <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-3 whitespace-pre-line">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </div>
              ))}
            </Accordion>
          )}
        </ScrollArea>
        
        <Separator />
        
        {/* Support Contact Section */}
        <div className="p-4 bg-muted/30">
          <div className="text-center mb-3">
            <p className="font-medium">Ainda precisa de ajuda?</p>
            <p className="text-sm text-muted-foreground">
              Se não encontrou sua resposta, fale conosco
            </p>
          </div>
          
          <Button 
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle className="h-4 w-4" />
            Falar com Suporte
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
          
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {SUPPORT_CONFIG.supportHours}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              WhatsApp
            </span>
          </div>
        </div>
        
        <DrawerFooter className="border-t pt-4">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Fechar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
