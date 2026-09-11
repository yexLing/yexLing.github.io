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
2. **直接提出具体问题，再解释。** The owner's opening asks why action
   prediction still generalizes poorly. Keep that directness, but do not turn
   every transition into a question or add rhetorical questions without answers.
3. **作者与读者显式对话。** Reader is 您; author is 我们/我。 State intent
   plainly: "我们在此就不过多介绍了，这不是本文的主题"、"方便不熟悉的朋友阅读，
   先铺垫一些必要的背景知识"。
4. **删掉清嗓子式的开场白。** No "人们说……指的是……" style windups; sections
   start with content ("2020 年，Kaplan 等人测量到……").

## Structure

5. **机制用段落讲清，分类按需列出。** Follow the owner's prose-based opening:
   state the input, what the model predicts, and what changes in the example.
   Use lists for genuine classifications, not as the default shape of a section.
6. **保留文章标题，章节标题具体而简短。** Keep the owner's headline
   "为什么机器人还只是一个遥控大玩具". For section navigation, prefer topic
   phrases such as "隐藏状态" and "人类视频的跨本体迁移". Avoid whole-sentence
   headings, vague paired nouns, and adding playful adjectives to technical terms.
7. **保留实用路标。** Skip-ahead links, figure captions, and the
   claims/checklist/watch-list surfaces stay.

## Terminology

8. **关键术语中英并置，不硬造中文词。** Scaling Law、scaling up、loss 曲线、
   Behavior Cloning、open-loop/闭环 — keep the English the field actually uses,
   glossed in Chinese on first use. Never invent translations like "规模化时刻".
9. **首次出现给一句白话解释。** Specify inputs and outputs before relying on a
   term. Name both branches when comparing two prediction heads. Keep technical
   distinctions accurate: behavior cloning is a method within imitation learning;
   memorizing examples can lower training loss while worsening validation loss.

## Precision

10. **叙述从宽，数字在图。** Prose may say "基本上是几万小时的数量级"; exact
    numbers live in figures, tables, and tests. Never loosen a number inside a
    测试/结果/结论 block — those stay exact.
11. **保留证据的出处和适用范围。** Style edits must not invent measurements or
    break `<sup><a href="#ref-N">` links. When the owner requests a substantive
    correction, remove or relocate an irrelevant formula or figure rather than
    preserving an invalid argument. Keep an unpublished copy of annotated source
    material when making substantial structural edits.

## Lessons from the owner's September 2026 annotations

- **批注先当作待解决的问题。** Trace the proposed explanation back to the cited
  model's actual inputs, objective, and experiment. Preserve the owner's question
  even when their proposed mechanism needs a narrower scope or a correction.
- **因果步骤要写出来。** Explain how a missing condition can lead to fitting an
  accidental correlation, and why that relation can fail on new examples. A
  training curve alone does not identify which mechanism occurred.
- **例子靠近论点。** Place a simulation in the subsection it helps explain.
  Explain why each implementation detail matters there; avoid an unexplained
  setup before the reader knows the question.
- **说明研究与本节的关系。** A study about environment coverage does not by itself
  establish a claim about temporal frame redundancy. Name the variable it changes
  and the outcome it measures. Avoid a generic progress roundup amid causal analysis.
- **尊重技术读者的背景。** Keep a skip-ahead link for introductory sections.
  Do not dwell on basic dataset splitting or use the known limits of deterministic
  mean regression to explain current generative action models.
- **把测量问题与学习机制分开。** Evaluation sample size and long-term reliability
  may warrant supplementary discussion; do not present them as causes of poor
  action generalization without an explicit mechanism.
- **保留作者与读者的对话，删除编辑过程。** Use 我们 and 您 where the owner's
  text does. Never publish TODOs, explanations of chat-driven revisions, or notes
  about how the article was assembled. Avoid formulaic negation-then-affirmation
  sentences and "真正重要的是"-style emphasis.
- **写清记录信息的对象。** When discussing what a model learns from demonstrations,
  name the training data rather than vaguely saying "演示记录了动作".
- **案例的条件不能省略。** State assumptions such as both routes being passable.
  A contact example illustrates missing state; it does not make hidden conditions
  that affect success exclusive to contact tasks.
- **结尾不重复目录。** Remove a standalone concluding section when it only
  restates earlier explanations. Do not force a return to the opening example
  without adding a useful connection or resolving the article's question.
