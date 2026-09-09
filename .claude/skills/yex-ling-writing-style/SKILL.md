---
name: yex-ling-writing-style
description: The site owner's Chinese tech-blog voice, extracted from their hand edits to the action-bottleneck zh article. Apply when writing or revising Chinese posts for yexLing.github.io.
---

# Yex Ling writing style（中文博客文风）

Extracted by diffing the owner's hand-rewritten opening of
`src/content/blog/zh/action-bottleneck.md` against the earlier translated
version. Apply these rules when writing or revising Chinese articles for this
site. The goal register: a sharp, friendly Chinese tech blog (知乎/公众号技术
长文), written *as* Chinese — never as translated English.

## Voice and address

1. **说人话，去翻译腔、去文学腔。** Cut literary flourishes and translated
   metaphors（"经典的搪塞之词""带着预训练来到现场""两股流""照抄同一套打法"）。
   Prefer plain statements: "视觉也是类似的套路"、"是不依靠机器人本体采集的"。
   Vivid is fine when it is *plain* vivid（"遥控大玩具"）; ornate is not.
2. **用直接的设问推动叙事。** Pose the question out loud, then answer it:
   "为什么？"、"是什么原因呢？"。Section pivots are questions, not essayistic
   transitions.
3. **作者与读者显式对话。** Reader is 您; author is 我们/我。 State intent
   plainly: "我们在此就不过多介绍了，这不是本文的主题"、"方便不熟悉的朋友阅读，
   先铺垫一些必要的背景知识"。
4. **删掉清嗓子式的开场白。** No "人们说……指的是……" style windups; sections
   start with content ("2020 年，Kaplan 等人测量到……").

## Structure

5. **枚举用列表，不用长段落。** Taxonomies (model families, learning methods,
   data streams) become numbered/nested lists with bold lead terms, not dense
   prose.
6. **标题口语化、有态度。** "为什么机器人还只是一个遥控大玩具"、"鼎鼎大名的
   Scaling Law" — colloquial, a little playful, states the point.
7. **保留实用路标。** Skip-ahead links, figure captions, and the
   claims/checklist/watch-list surfaces stay.

## Terminology

8. **关键术语中英并置，不硬造中文词。** Scaling Law、scaling up、loss 曲线、
   Behavior Cloning、open-loop/闭环 — keep the English the field actually uses,
   glossed in Chinese on first use. Never invent translations like "规模化时刻".
9. **首次出现给一句白话解释。** e.g. 输出动作指令（关节电机/舵机信号，也可以是
   抽象的高阶运动指令）；死记时 loss 曲线只会上下震荡、均值不降。

## Precision

10. **叙述从宽，数字在图。** Prose may say "基本上是几万小时的数量级"; exact
    numbers live in figures, tables, and tests. Never loosen a number inside a
    测试/结果/结论 block — those stay exact.
11. **引用、公式、图注一律保留。** Style edits never drop a citation, change a
    measured number, or break the `<sup><a href="#ref-N">` structure.
