'use client';

import { mockQATrees } from "../../../lib/mock-data";
import { notFound } from "next/navigation";
import { AnswerCard } from "../../../components/card/acard";
import { QuestionCard } from "../../../components/card/qcard";
import ReusableTiptapEditor from "../../../components/common/ReusableTiptapEditor";
import { use, useEffect, useState, useRef } from "react"; // 1. 确保导入 useRef
import { motion, AnimatePresence } from "framer-motion";

interface QATreePageProps {
  params: Promise<{
    treeId: string;
  }>;
}

// Using a Discriminated Union for type safety
type QuestionCardData = {
  id: string;
  type: 'question';
  question: string;
  avatar?: string;
  x: number;
  y: number;
};

type AnswerCardData = {
  id:string;
  type: 'answer';
  title: string;
  content: string;
  x: number;
  y: number;
};

type CardData = QuestionCardData | AnswerCardData;

export default function QATreePage({ params }: QATreePageProps) {
  const { treeId } = use(params);
  const [isMounted, setIsMounted] = useState(false);
  
  const [cards, _] = useState<CardData[]>([
    { id: 'q1', type: 'question', question: '如何创建node应用', avatar: 'https://i.pravatar.cc/150?u=zhangsan', x: 400, y: 100 },
    { id: 'a1', type: 'answer', title: '什么是React的useState Hook？', content: '夜深人静，万籁俱寂。窗外偶有微风拂过树叶，发出细微的沙沙声，像', x: 400, y: 320 },
  ]);

  const [editingCard, setEditingCard] = useState<{ id: string; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // 2. 创建 ref 来追踪点击的起点
  const isPointerDownOnInteractiveArea = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const qaTree = mockQATrees.find(tree => tree.id === treeId);
  if (!qaTree) {
    notFound();
  }

  const handleCardClick = (card: CardData) => {
    setSelectedCardId(card.id);
    if (card.type === 'question') {
      const initialText = drafts[card.id] !== undefined ? drafts[card.id] : card.question;
      setEditingCard({ id: card.id, text: initialText });
    } else {
      setEditingCard(null);
    }
  };

  const handleUpdate = (newText: string) => {
    if (!editingCard) return;
    setEditingCard({ ...editingCard, text: newText });
    if (newText.trim() !== '') {
      setDrafts(prevDrafts => ({ ...prevDrafts, [editingCard.id]: newText }));
    } else {
      setDrafts(prevDrafts => {
        const newDrafts = { ...prevDrafts };
        delete newDrafts[editingCard.id];
        return newDrafts;
      });
    }
  };

  const handleSubmit = (submittedText: string) => {
    if (!editingCard) return;
    console.log(`追问 (Follow-up question for card ${editingCard.id}): ${submittedText}`);
    setDrafts(prevDrafts => {
      const newDrafts = { ...prevDrafts };
      delete newDrafts[editingCard.id];
      return newDrafts;
    });
    setEditingCard(prev => prev ? { ...prev, text: '' } : null);
  };

  const handleExpand = () => { console.log("Expand/Drawer button clicked"); };
  const handleFollowUp = () => { console.log("Follow-up button clicked"); };

  if (!isMounted) {
    return null;
  }

  return (
    <div 
      className="relative w-full h-screen"
      // 5. 在背景上同时监听 onMouseDown 和 onClick
      onMouseDown={() => {
        // 当鼠标在背景上按下时，将标志位置为 false
        isPointerDownOnInteractiveArea.current = false;
      }}
      onClick={() => {
        // 如果标志位为 true，说明 mousedown 发生在卡片上，应忽略此次点击
        if (isPointerDownOnInteractiveArea.current) {
          // 不做任何事，等待下一次真正的背景点击
          return;
        }
        // 否则，这是一次真正的背景点击，执行取消选中的逻辑
        setSelectedCardId(null);
        setEditingCard(null);
      }}
    >
      {cards.map((card) => (
        <div 
          key={card.id} 
          style={{ position: 'absolute', top: card.y, left: card.x }}
          // 3. 在卡片按下时，将标志位置为 true
          onMouseDown={(e) => {
            e.stopPropagation();
            isPointerDownOnInteractiveArea.current = true;
          }}
        >
          {card.type === 'question' ? (
            <QuestionCard 
              question={card.question}
              avatar={card.avatar}
              isSelected={selectedCardId === card.id}
              onClick={() => handleCardClick(card)}
              onCopy={() => console.log('Question copied')}
              onCopyError={(err) => console.error('Question copy failed:', err)}
              onDelete={() => console.log('删除问题卡片')}
            />
          ) : (
            <AnswerCard
              title={card.title}
              content={card.content}
              isCompleted={true}
              isSelected={selectedCardId === card.id}
              onClick={() => handleCardClick(card)}
              onCopy={() => console.log('Answer copied')}
              onCopyError={(err) => console.error('Answer copy failed:', err)}
              onExpand={handleExpand}
              onFollowUp={handleFollowUp}
              onDelete={() => console.log('删除回答卡片')} 
            />
          )}
        </div>
      ))}

      <AnimatePresence>
        {editingCard && (
          <motion.div
            className="absolute bottom-12 left-0 right-0 bg-transparent flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div 
              className="pointer-events-auto" 
              // 4. 在输入框按下时，将标志位置为 true
              onMouseDown={(e) => {
                e.stopPropagation();
                isPointerDownOnInteractiveArea.current = true;
              }}
            >
                <ReusableTiptapEditor
                  key="qatree-search-section"
                  content={editingCard.text}
                  onUpdate={handleUpdate}
                  onSubmit={handleSubmit}
                  placeholder="输入内容以优化或追问..."
                  isSubmitting={isSubmitting}
                  disabled={isSubmitting}
                  variant="bottomBar"
                />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}