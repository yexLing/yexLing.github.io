---
title: 'Agent Memory，正在越过 RAG'
description: '从长窗口退化、KV cache 治理，到 Claude Code、Codex、Hermes、OpenClaw 的记忆设计，Agent memory 正在从检索功能变成运行时系统。'
pubDate: 2026-06-22
tags: [agents, memory, context-engineering, RAG, KV-cache]
locale: zh
---

2023 年，斯坦福大学与 Google Research 联合发布了 Generative Agents 研究。在这个包含 25 个虚拟角色的沙盒环境中，外界的注意力大多集中在 AI NPC 的概念上。但从工程视角来看，该研究真正的遗产是其记忆流（memory stream）设计。

每个 Agent 将观察转化为记忆，系统根据近因性、相关性和重要性进行打分与检索。经过一段时间的积累，零碎的观察记录通过反思机制合成为高层判断，进而影响后续行动。这套机制虽然基础，但已经触及了 Agent 记忆系统的核心难题：当前任务如何存储，过去事件如何回溯，稳定事实如何沉淀，以及旧信息如何压缩与撤销。

过去数月，从学术界的论文到 Claude Code、Codex 的工程实践，Agent 记忆系统正在经历一次密集的架构演进。长上下文的性能退化、KV cache 的复用机制、项目记忆的分层管理，以及 MCP 工具调用的沙箱设计，这些看似分散的技术探索，全部指向了同一个系统瓶颈：上下文的调度与生命周期管理。

当模型的上下文窗口只能容纳任务的一个切片时，系统必须决定：模型此刻应该读取什么信息？哪些数据需要保存在窗口之外？

当一个 Agent 连续运行数小时甚至数周，它面临的本质困难并非简单的数据存储，而是一个极具挑战的算法与科学建模问题：如何在复杂的推理链路中，于恰当的节点精准召回所需的记忆片段。高级智能的体现，不在于“记住所有”，而在于“按需提取”与“信念修正”。在多步推理中，模型需要跨越时间线，将早期收集的零散线索拼凑成新的结论；同时，当新证据推翻了先前的假设时，系统必须有能力识别并更新这些认知。

工程层面的异构数据进一步放大了挑战。Agent 的上下文窗口中，被迫混合了不同性质的信息：文档片段、用户目标、系统规则、工具定义、历史对话、错误日志、执行计划等等。这些信息的生命周期、可靠性与安全边界各不相同。

面对这种科学与工程叠加的复杂性，行业早期的通用方案是 RAG（检索增强生成）。系统将文件切块存入向量数据库，在下一轮对话中检索调用。

但这套基于相似度检索的机制很快显露出局限。片段过短，模型只能获取孤立事实；片段过长，检索结果本身会成为噪音。单一的语义检索容易遗漏错误码，而纯粹的关键词检索无法应对改写后的查询。如果没有重排（rerank），真正相关的片段会被表面相似的冗余信息取代；如果不附带时间和来源，模型将无法区分新旧事实。

Anthropic 推出的 Contextual Retrieval 为每个片段补充了文档级上下文[^20]，OpenAI 的 File Search 则将多路检索和重排封装进工具中[^21]。这些修补证明了一点：RAG 解决的仅仅是信息的提取，而 Agent 记忆系统需要处理的是信息进入系统后的完整生命周期。

既然外部检索不够，直接扩大模型的内部容量是否可行？长窗口技术的普及并未消除这一挑战。

2023 年的《Lost in the Middle》研究发现，模型容易忽略长上下文中间位置的信息[^2]。到 2025 年，Chroma Research 对 18 个前沿模型进行了控制变量实验，结论明确：输入越长，准确率越低。许多模型在远未达到标称窗口上限时，性能就已经开始退化。一个标称 200K token 的窗口，可能在输入达到 50K token 时，准确率便开始显著下降[^4]。

![Context rot，Claude、GPT-4.1、Qwen3 和 Gemini 2.5 Flash 在控制变量任务上，准确率随输入长度持续下滑。](/images/blog/agent-system-design-2026/context-rot.jpg)

*长窗口里的性能退化。来源，Chroma Research，Context Rot，2025 年 7 月。*

这种退化并非单一模型的工程缺陷。大语言模型基于自然语言分布进行训练，而自然语言中极少存在强长距离依赖的样本。2024 年 ACL 的 ProLong 论文证实：单纯使用长上下文进行训练，并不会自动增强模型的长上下文推理能力，关键在于训练样本中是否包含强依赖关系[^6]。

长窗口扩充了系统的物理容量，但系统依然需要做出逻辑选择。无论窗口多大，系统都必须决定哪些信息进入活跃上下文，哪些留在外部。

既然暴力扩容和简单检索都无法彻底解决问题，行业共识开始转向分层架构。到 2026 年中，成熟的 Agent 记忆系统基本收敛为三部分：活跃上下文（模型当前轮次直接调用的状态）、持久化记忆（窗口外长期保存、可审计的材料），以及连接两者的记忆控制器（负责信息的检索、排序、压缩、写入和过期）。

![Agent memory 运行时结构，输入事件进入记忆控制器，控制器装配活跃上下文，并维护持久化记忆。](/images/blog/agent-system-design-2026/agent-memory-stack.svg)

*示意图，输入事件进入记忆控制器，控制器装配活跃上下文，维护持久化记忆。*

学术界曾用认知架构描绘过这套体系。CoALA 将语言 Agent 的信息存储分为工作记忆（working memory）和长期记忆，长期记忆又细分为情景记忆、语义记忆和程序性记忆[^7]。但在工程实现中，开发者需要处理更具体的机制：信息究竟以什么形态存储？何时进入窗口？如何被遗忘？

在活跃上下文中，KV cache 正在从纯粹的底层优化技术，演变为一种运行时记忆。

在短对话场景下，KV cache 仅用于加速推理。但在长上下文和多轮 Agent 场景中，它保存的是模型已经计算过的注意力状态。随着上下文长度增加，KV cache 对显存的占用急剧上升。vLLM 的 PagedAttention 通过分页管理减少内存碎片[^10]。在 CacheBlend 和 LMCache 的研究中，系统开始尝试融合 RAG 检索返回的零散片段的预计算 KV cache，甚至将其转化为跨引擎的存储和传输层[^11][^12]。

从 SnapKV 到 2026 年的 TTKV 和 KVDrive，研究者的注意力集中在一个问题上：哪些 token 的 KV 状态值得保留在 HBM（高带宽内存）中，哪些应该被淘汰或转移至 SSD[^13][^14]。这一演进正在改变检索的形态——未来检索找回的可能不再是一段文本，而是一段预计算好的模型状态。

但 KV cache 无法承担长期记忆的功能。它与具体的模型和 tokenizer 强绑定，缺乏可解释性，难以跨模型迁移。项目事实、用户偏好、工具权限等需要审计溯源的材料，必须以显式记忆的形式存储在窗口之外。

这就是持久化记忆层的作用。Claude Code 和 Codex 提供了显式记忆的工程方案。

Claude Code 使用 `CLAUDE.md` 存储项目规则，通过自动记忆机制将纠正和偏好记录为笔记，并在大型项目中拆分出路径作用域的规则或技能（skills）[^15]。Codex 则将 `AGENTS.md`、技能、记忆和工作流进行细分，分别管理规则、流程、偏好和长期任务[^16]。

其中，技能（skills）的设计解决了程序性记忆的问题——它保存的是一套执行流程，而非单一事实。Claude Code 和 Codex 均采用了按需加载（progressive disclosure）机制。系统启动时，模型仅读取技能的名称和描述；只有当模型决定调用某项技能时，完整的 `SKILL.md` 正文才会被加载。这种设计分离了能力索引与细节，避免了上下文窗口被冗长的脚本说明迅速占满。

Hermes Agent 和 OpenClaw 也采用了类似架构，将耐久事实、工作轨迹和上下文组装引擎进行拆分[^17][^18]。Letta（原 MemGPT）此前的比喻最为直观：当前窗口有限，外部记忆需要主动换入换出，这类似于操作系统中的内存分页机制[^19]。

有了活跃上下文和持久化记忆，系统还需要一个记忆控制器来管理写入与压缩。

Claude Code 和 Hermes 会在会话压缩前进行拦截，将长期事实从短期状态中提取并保存。Context-Folding 和 U-Fold 等研究则试图让模型自主判断，何时将局部探索的轨迹折叠成摘要并返回主上下文[^23]。

![Context-Folding，Agent 分叉到临时子轨迹，中间步骤折叠成摘要回到主上下文。](/images/blog/agent-system-design-2026/context-folding-example.jpg)

*分支折叠机制，局部子任务在临时上下文探索，结束后折叠为摘要。来源，Context-Folding 项目页面，2025 年 10 月。*

在工程实践中，压缩和遗忘的价值长期被低估。长任务失败，往往不是因为模型推理能力不足，而是上下文状态出现了混乱。当用户中途更改目标、系统修复了某个 Bug、接口发生变更，或者模型自身做出了错误假设时，如果这些旧事实依然以同等权重保留在摘要中，后续任务必然受到污染。

在 Agent 系统中，遗忘是一种必要的主动控制。但工程系统不能依赖模糊的遗忘机制，它需要清晰的记录：为什么保留某条信息？为什么降低另一条的权重？如果结论被撤销，原始证据是否依然保留？

除了控制写入与遗忘，系统还需要控制信息的“爆炸源”——工具调用。

传统的 MCP（模型上下文协议）调用会消耗大量上下文空间：多个服务器的 schema 定义可能占据数万 token；工具返回的大量日志会直接进入模型上下文，而模型实际需要的可能只是其中的少数几行。

Anthropic 在 2025 年底提出了一种新方案：将 MCP 服务器暴露为文件系统中的代码模块，允许 Agent 编写代码在沙箱中调用、过滤和聚合数据，最终仅将必要的结果返回给模型[^24]。在他们的测试中，一个工作流的上下文消耗从 150K token 降至 2K token。

![传统 MCP，所有工具定义和中间结果全部进入模型上下文。代码执行版，MCP 暴露为文件系统中类型化代码模块。](/images/blog/agent-system-design-2026/mcp-code-exec.png)

*代码执行把中间过程留在沙箱里，只把过滤后的结果放回模型窗口。来源，Anthropic，Code Execution with MCP，2025 年 11 月。*

这一改变的深层影响在于：循环、临时文件和局部变量等中间状态，可以保留在沙箱中，无需进入模型窗口参与注意力计算。沙箱、权限和审计不再是外围组件，而是记忆系统的核心部分。Agent 记录了什么、调用了什么接口、中间状态存储在何处，都需要完整的追踪机制。

当单个 Agent 的记忆管理变得如此复杂时，多 Agent 架构进一步放大了记忆共享的矛盾。

2025 年 6 月，Cognition 发表文章《Don’t Build Multi-Agents》，警告了决策分散和上下文共享的风险[^25]。Anthropic 随后公布的多 Agent 研究系统架构也设定了明确的限制条件：“如果任务要求所有 Agent 共享同一批上下文，或者存在大量依赖，今天的多 Agent 系统并不合适”[^26]。

多 Agent 系统首先需要回答一个问题：上下文能否被拆分？

如果上下文无法拆分，Agent 数量越多，通信损失和状态失真就越严重。Tran 和 Kiela 在 2026 年的对照实验显示：在统一思考 token 预算后，单 Agent 的表现可以匹敌甚至超过多 Agent。根据信息论中的数据处理不等式，信息在经过压缩、转述和传递后，互信息上限只会下降[^27]。

![Anthropic 多 Agent 研究架构，主导 Agent 接收查询、规划，派生专门子 Agent 并行搜索，各子 Agent 独立上下文窗口。](/images/blog/agent-system-design-2026/multi-agent-arch.png)

*Orchestrator-worker 模式，主导 Agent 拆解查询，子 Agent 在隔离上下文中并行搜索。来源，Anthropic Engineering，2025 年 6 月。*

在系统实现中，多个 Agent 可以共享文档库或测试日志等持久化记忆，但活跃上下文和 KV cache 难以完整共享。Agent 之间交换的通常是摘要、工单、状态机和原文链接。如同人类团队协作，Agent 之间也需要依赖文档和证据链接，而非仅靠简单的状态确认。只有当并行收益超过通信损耗时，多 Agent 架构才具备合理性。

至此，Agent 记忆系统已经超越了单一的检索功能，演变为一个小型运行时环境。

各类输入事件进入系统后，记忆控制器负责过滤、排序、压缩和审计。最终，部分信息进入活跃上下文，部分写入持久化记忆，其余过程数据则留在沙箱和临时文件中。

人类记忆经常被用作 Agent 记忆的类比。人类会遗忘，会依赖线索进行重构。但工程系统无法容忍纯粹的模糊重构。系统必须精确地记录信息的留存依据、权重变化原因，以及结论撤销后的证据保留状态。

长窗口技术的上限仍在提升，KV cache 也在向状态管理器演进。但当一个复杂任务进入中后期，系统面临的考验依然具体：用户中途更改了三次需求，工具返回了数万行日志，模型自身也做出了两次错误假设。此时，系统是否还能理清当前状态的来龙去脉？

只有理清这些状态，Agent 才能从简单的长对话工具，转变为能够长期独立工作的系统。

回到 2023 年那个包含 25 个虚拟角色的沙盒小镇。当时外界惊叹于它们表现出的“生活感”。三年后，工程界关注的焦点已经发生转移：

当一个 Agent 连续运行了足够长的时间后，它是否还记得自己最初的目标。

[^1]: Joon Sung Park et al., Generative Agents，Interactive Simulacra of Human Behavior, arXiv 2304.03442, 2023. https://arxiv.org/abs/2304.03442
[^2]: Nelson F. Liu et al., Lost in the Middle，How Language Models Use Long Contexts, arXiv 2307.03172, 2023. https://arxiv.org/abs/2307.03172
[^3]: Found in the Middle and RULER / LongBench long-context evaluations, 2024. https://arxiv.org/abs/2406.16008 ; https://arxiv.org/abs/2404.06654 ; https://arxiv.org/abs/2308.14508
[^4]: K. Hong, A. Troynikov, J. Huber, Context Rot，How Increasing Input Tokens Impacts LLM Performance, Chroma Research, July 14, 2025. https://research.trychroma.com/context-rot
[^5]: Simeng Sun, Kalpesh Krishna, Andrew Mattarella-Micke, Mohit Iyyer, Do Long-Range Language Models Actually Use Long-Range Context?, EMNLP 2021. https://arxiv.org/abs/2109.09115
[^6]: Longze Chen et al., Long Context is Not Long at All，A Prospector of Long-Dependency Data for Large Language Models, ACL 2024. https://aclanthology.org/2024.acl-long.447/
[^7]: Theodore R. Sumers et al., Cognitive Architectures for Language Agents, arXiv 2309.02427, 2023. https://arxiv.org/abs/2309.02427
[^8]: LangChain Docs, Memory overview; LangMem Docs, Long-term Memory in LLM Applications. https://docs.langchain.com/oss/python/concepts/memory ; https://langchain-ai.github.io/langmem/concepts/conceptual_guide/
[^9]: Zeyu Zhang et al., A Survey on the Memory Mechanism of Large Language Model based Agents, arXiv 2404.13501, 2024; Alessandra Terranova et al., Evaluating Long-Term Memory for Long-Context Question Answering, arXiv 2510.23730, 2025. https://arxiv.org/abs/2404.13501 ; https://arxiv.org/abs/2510.23730
[^10]: Woosuk Kwon et al., Efficient Memory Management for Large Language Model Serving with PagedAttention, arXiv 2309.06180, 2023. https://arxiv.org/abs/2309.06180
[^11]: Yiwen Hu et al., CacheBlend，Fast Large Language Model Serving with Cached Knowledge Fusion, arXiv 2405.16444, 2024. https://arxiv.org/abs/2405.16444
[^12]: LMCache project and paper, 2025. https://arxiv.org/abs/2510.09665
[^13]: H2O, StreamingLLM, SnapKV, PyramidKV, and KIVI, KV cache eviction, streaming, compression, and quantization research, 2023-2024. https://arxiv.org/abs/2306.14048 ; https://arxiv.org/abs/2309.17453 ; https://arxiv.org/abs/2404.14469 ; https://arxiv.org/abs/2406.02069 ; https://arxiv.org/abs/2402.02750
[^14]: TTKV and KVDrive, 2026 KV cache tiering / storage-management work. https://arxiv.org/abs/2604.19769 ; https://arxiv.org/abs/2605.18071
[^15]: Anthropic, Claude Code Docs, Memory, Skills, Context Window, and Scheduled Tasks. https://code.claude.com/docs/en/memory ; https://code.claude.com/docs/en/skills ; https://code.claude.com/docs/en/context-window ; https://code.claude.com/docs/en/scheduled-tasks
[^16]: OpenAI, Codex Docs, AGENTS.md, Agent Skills, Memories, and Workflows. https://developers.openai.com/codex/guides/agents-md ; https://developers.openai.com/codex/skills ; https://developers.openai.com/codex/memories ; https://developers.openai.com/codex/workflows
[^17]: Nous Research, Hermes Agent Docs and repository. https://hermes-agent.nousresearch.com/ ; https://github.com/nousresearch/hermes-agent
[^18]: OpenClaw Docs, Memory and Context Engine. https://docs.openclaw.ai/concepts/memory ; https://docs.openclaw.ai/concepts/context-engine
[^19]: Charles Packer et al., MemGPT，Towards LLMs as Operating Systems, arXiv 2310.08560, 2023. https://arxiv.org/abs/2310.08560 ; Letta Docs, memory blocks and archival memory. https://docs.letta.com/
[^20]: Anthropic, Introducing Contextual Retrieval, September 2024. https://www.anthropic.com/news/contextual-retrieval
[^21]: OpenAI Platform Docs, File Search. https://platform.openai.com/docs/guides/tools-file-search
[^22]: Zhong et al., MemoryBank，Enhancing Large Language Models with Long-Term Memory, arXiv 2305.10250, 2023. https://arxiv.org/abs/2305.10250
[^23]: Sun et al., Context-Folding，Context Management for Efficient Agentic Reasoning, arXiv 2510.11967, 2025; U-Fold，Universal Context Folding for Long-Context Reasoning, arXiv 2601.18285, 2026. https://arxiv.org/abs/2510.11967 ; https://arxiv.org/abs/2601.18285
[^24]: Anthropic Engineering, Code execution with MCP，building more efficient agents, November 4, 2025. https://www.anthropic.com/engineering/code-execution-with-mcp
[^25]: Walden Yan, Don’t Build Multi-Agents, Cognition Blog, June 12, 2025. https://cognition.ai/blog/dont-build-multi-agents
[^26]: Anthropic Engineering, How we built our multi-agent research system, June 13, 2025. https://www.anthropic.com/engineering/multi-agent-research-system
[^27]: Dat Tran, Douwe Kiela, Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets, arXiv 2604.02460, April 2026. https://arxiv.org/abs/2604.02460

*文中图片来自 Chroma Research、Anthropic Engineering、Context-Folding 项目页，以及本文自制示意图。模型和评测结果来自各论文、厂商博客或项目文档截至 2026 年中的公开材料，未独立复现的数字应按论文或厂商自报理解。*