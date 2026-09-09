---
title: "AI 设计 3D 打印腕托：用 Codex + Blender 为 Alice 键盘建模"
date: 2026-06-21
locale: zh
---

我想要一个真正贴合我**AJAZZ AKS075 Alice 键盘**的腕托：前缘不是简单矩形，
中间有 Alice 式的 V 形，而且得能在普通桌面 3D 打印机上打印。

![Printed wrist rest matched to the AJAZZ AKS075 keyboard](/images/news/ai-wrist-rest/final-printed-wrist-rest.jpg)

*最终成品：分体式 3D 打印腕托，贴合 AJAZZ AKS075 Alice 键盘。*

有意思的不仅是腕托本身。这个实验的核心是：能不能把 **Codex agent 当成 CAD
操作员** — 用自然语言描述形状，让 agent 用 Python 驱动 Blender，检查结果，
修正，迭代。全程不需要先学会 Blender。

![AJAZZ AKS075 Alice keyboard reference photo](/images/news/ai-wrist-rest/ajazz-aks075-keyboard-photo.jpg)

*决定形状的键盘：AJAZZ AKS075 Alice 布局，前缘不对称，中间 V 形是普通矩形
腕托无法跟随的。*

## 形状

目标是 AKS075 布局的低矮人体工学腕托。整体占地面积约 **328 × 60 mm**，
带有与键盘外壳匹配的非对称 Alice V 形。顶面不是平的：在中缝处隆起，
向外侧平滑下降。

最终可打印版本在 V 形接缝处分体：左侧带有融合梯形榫头，右侧有对应的
母槽，打印后可将两半组装在一起。

![Split STL render with fused connector](/images/news/ai-wrist-rest/wrist-rest-split-render.jpg)

*分体打印版。左侧带有融合的榫头连接器；右侧有对应的卯槽。*

## 折腾的过程

这不是一次性结果。初版大致把握了轮廓，但细节反复翻车 — 很多问题只有从另
一个角度观察、或者从切片软件的角度思考才能发现：

- V 形缺口镜像方向反了；
- "V 形中间"被理解为表面区域而非分体接缝本身；
- 第一个人体工学表面在侧光下显得太斑驳；
- 基于环的网格产生了可见的过渡折痕；
- 榫卯连接器视觉上看起来对，但榫头被导出为独立松散壳体，没有融合到左侧体中。

最终版本是在像检查可打印对象一样验证网格后才变得可靠：水平 V 形与未加
人体工学的参考一致，顶面成为连续的高度场，左侧分体 STL 导入后是**一个
整体**，榫头已融合在体内。

## 打印结果

Bambu Studio 中 P2S 的最终切片预估：

<div class="stat-grid">
  <div><strong>打印机</strong><span>Bambu Lab P2S</span></div>
  <div><strong>材料</strong><span>PLA</span></div>
  <div><strong>打印时间</strong><span>2 小时 17 分</span></div>
  <div><strong>耗材</strong><span>92.40 g</span></div>
</div>

![Bambu Studio slicing preview](/images/news/ai-wrist-rest/final-bambu-slicer-result.jpg)

*Bambu Studio 中最终分体布局，打印前。*

## STL 文件

<div class="download-grid">
  <a href="/downloads/ai-wrist-rest/ajazz-aks075-ai-wrist-rest-full.stl">完整参考 STL</a>
  <a href="/downloads/ai-wrist-rest/ajazz-aks075-ai-wrist-rest-left-fused.stl">左侧分体 STL</a>
  <a href="/downloads/ai-wrist-rest/ajazz-aks075-ai-wrist-rest-right.stl">右侧分体 STL</a>
</div>

分体文件是实际打印用的。完整 STL 作为参考模型一并提供。

## 什么管用了

用 AI coding agent 做这个是绝对可行的。agent 写 Blender Python，生成 STL
文件，打开场景供检查，并迭代几何体：轮廓形状、圆角 V 形过渡、分体零件、
连续顶面、榫卯连接器。

核心优势是界面变成了语言：

> "让 V 形中间高一点，保持水平 V 形不变，让顶面凸起，分成两个可打印的零件。"

这种体验跟先学完一整套 CAD 工具再做第一个可用物件，完全是两回事。

## 什么还疼

还是折腾了好几轮。有些错误很微妙但很重要：一个表面在某束光下看起来光滑，
换个角度就有折痕；一个连接器视觉上对了，但还得验证它确实是一个融合的可
打印整体。对于 3D 打印，"看起来对"是不够的；STL 必须被当作真正可制造的
网格来检查。

经验教训：AI 可以成为一个有用的 CAD 操作员，但人仍然需要检查、测量、打印、
修正。这不像按一个魔法按钮，更像跟一个非常快的、会写 Blender 代码的初级
CAD 助手结对工作。

## 下次

我认为更快的流程会是：

1. 先用图像生成或手绘工具产出**前/顶/侧 CAD 式参考视图**。
2. 在 2D 视图上确认尺寸和连接方式。
3. 然后再让 agent 在 Blender 里构建真正的 3D 模型。

这样应该能减少来回修正的次数，因为 agent 在写任何网格代码之前就有了更
清晰的几何目标。

所以结论是：是的，用 Codex 构建可打印的 3D 物体是一条可行的路径，即使
没有 Blender 技能。不是魔法，但确实是一个全新的工作流。
