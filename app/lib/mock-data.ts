// Mock数据文件
// 提供侧边栏组件使用的模拟数据，包括QATree列表和用户信息

// QATree列表Mock数据
export const mockQATrees = [
  {
    id: "tree1",
    name: "React学习笔记",
    description: "前端开发相关知识图谱",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20")
  },
  {
    id: "tree2", 
    name: "Node.js实践",
    description: "后端开发实践经验",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18")
  },
  {
    id: "tree3",
    name: "数据结构算法",
    description: "计算机基础知识整理",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "tree4",
    name: "TypeScript进阶",
    description: "TypeScript高级特性学习",
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-22")
  }
];

// 用户信息Mock数据
export const mockUser = {
  id: "user1",
  name: "张三",
  email: "zhangsan@example.com",
  avatar: "https://i.pravatar.cc/150?u=zhangsan"
};

// 主导航项目Mock数据
export const mockMainNavItems = [
  {
    key: "home",
    href: "/",
    icon: "solar:home-2-linear",
    title: "首页"
  },
  {
    key: "discover",
    href: "/discover", 
    icon: "solar:compass-linear",
    title: "发现"
  },
  {
    key: "qatree-list",
    href: "/qatree-list",
    icon: "solar:folder-linear", 
    title: "QATree列表"
  }
]; 