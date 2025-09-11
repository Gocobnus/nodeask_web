'use client';

import { mockQATrees } from "../../../lib/mock-data";
import { notFound } from "next/navigation";
import { AnswerCard } from "../../../components/card/acard";
import { QuestionCard } from "../../../components/card/qcard";
import ReusableTiptapEditor from "../../../components/common/ReusableTiptapEditor";
import { use, useEffect, useState } from "react";
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
  id: string;
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
  
  const [cards, setCards] = useState<CardData[]>([
    { id: 'q1', type: 'question', question: '如何创建node应用', avatar: 'https://i.pravatar.cc/150?u=zhangsan', x: 400, y: 100 },
    { id: 'a1', type: 'answer', title: '什么是React的useState Hook？', content: '夜深人静，万籁俱寂。窗外偶有微风拂过树叶，发出细微的沙沙声，像', x: 400, y: 320 },
  ]);

  const [editingCard, setEditingCard] = useState<{ id: string; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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
      // 如果存在草稿，则使用草稿内容；否则，使用卡片原始内容
      const initialText = drafts[card.id] !== undefined ? drafts[card.id] : card.question;
      setEditingCard({ id: card.id, text: initialText });
    } else {
      setEditingCard(null);
    }
  };

  const handleUpdate = (newText: string) => {
    if (!editingCard) return;

    // 更新实时显示的编辑状态
    setEditingCard({ ...editingCard, text: newText });

    // 只有当文本不为空时，才将其保存为草稿
    if (newText.trim() !== '') {
      setDrafts(prevDrafts => ({
        ...prevDrafts,
        [editingCard.id]: newText,
      }));
    }
  };

  const handleSubmit = (submittedText: string) => {
    if (!editingCard) return;

    console.log(`追问 (Follow-up question for card ${editingCard.id}): ${submittedText}`);

    // 提交后清除草稿
    setDrafts(prevDrafts => {
      const newDrafts = { ...prevDrafts };
      delete newDrafts[editingCard.id];
      return newDrafts;
    });

    // 清空编辑器文本。按钮会因为内容为空而自动禁用。
    setEditingCard(prev => prev ? { ...prev, text: '' } : null);
  };

  const handleExpand = () => {
    console.log("Expand/Drawer button clicked");
  };

  const handleFollowUp = () => {
    console.log("Follow-up button clicked");
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div 
      className="relative w-full h-screen p-6"
      onClick={() => {
        setSelectedCardId(null);
        setEditingCard(null);
      }}
    >
      {cards.map((card) => (
        <div key={card.id} style={{ position: 'absolute', top: card.y, left: card.x }}>
          {card.type === 'question' ? (
            <QuestionCard 
              question={card.question}
              avatar={card.avatar}
              isSelected={selectedCardId === card.id}
              onClick={(e) => {
                if (e) e.stopPropagation();
                handleCardClick(card);
              }}
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
              onClick={(e) => {
                if (e) e.stopPropagation();
                handleCardClick(card);
              }}
              onCopy={() => console.log('Answer copied')}
              onCopyError={(err) => console.error('Answer copy failed:', err)}
              onExpand={handleExpand}
              onFollowUp={handleFollowUp}
            />
          )}
        </div>
      ))}

      <AnimatePresence>
        {editingCard && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-transparent flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="w-full max-w-[766px] pointer-events-auto mb-4" onClick={(e) => e.stopPropagation()}>
                <ReusableTiptapEditor
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