---
title: "Agent Memory 现状和未来"
description: "长窗口、KV cache、持久化记忆和记忆控制器，正在把 Agent memory 从检索功能变成运行时系统。"
pubDate: 2026-06-22
tags: ["agents", "memory", "context-engineering", "RAG", "KV-cache"]
locale: zh
---

2023 年 4 月，Stanford 和 Google Research 做了一个小镇实验：25 个生成式 Agent 住在同一个虚拟社区里，起床、做饭、聊天、组织情人节派对[^1]。这个项目后来常被当作“AI NPC”案例引用。更值得留下来的，是那套很早的 Agent memory 设计。

每个 Agent 都有一条 memory stream，里面不断写入观察到的事件。检索时，系统同时看三件事：这条记忆离现在多近、和当前任务多相关、重要性有多高。过一段时间，Agent 会把零散记忆做 reflection，形成更高层的判断，再用这些判断安排接下来的计划。

这套设计还很粗糙，却已经把 Agent memory 拆成了几件事：当前任务要进入可直接计算的上下文，过去事件要能回查，稳定事实要沉淀，重复流程要复用，旧信息还要被压缩、降权或撤销。三年后，Claude Code、Codex、Hermes、OpenClaw、Letta、LangGraph 这些系统复杂了很多，仍在处理同一组问题。

很多工程系统最早把 memory 做成外部存储：把对话、文档或工具结果切片，写进一个库，下一轮再检索回来。到 2026 年中，这个做法已经覆盖不了全部问题。模型窗口会退化，KV cache 开始被管理，文件和数据库要保留证据，检索系统要做重排和权限过滤，工具沙箱里也会留下大量中间状态。Agent memory 开始变成一套运行时结构：输入事件先进控制器，再被装配进活跃上下文，或写入持久化记忆。

---

## 模型长窗口的局限

长窗口先缓解了最明显的问题：很多文档、日志、代码和历史对话可以保留完整形态。上下文选择仍然存在。材料在当前窗口里，不等于模型会正确使用；任务继续变长时，窗口也仍然放不下全部上下文。

模型可见的 token 在增长，有效上下文增长得更慢。

2023 年的 **Lost in the Middle** 已经观察到，模型在长上下文里更容易使用开头和结尾的信息，中间位置的信息更容易被忽略[^2]。后来 **Found in the Middle**、RULER、LongBench 继续把位置、长度和任务类型拆开测[^3]。到 2025 年，Chroma Research 用控制变量实验测了 18 个前沿模型，给出了更直观的曲线：输入越长，准确率越低，很多模型在远没填满标称窗口时就开始退化[^4]。

一个标称 200K token 的窗口，可能在 50K token 左右就已经出现准确率下降。

![Context rot：Claude、GPT-4.1、Qwen3 和 Gemini 2.5 Flash 在控制变量任务上，准确率随输入长度持续下滑。](/images/blog/agent-system-design-2026/context-rot.jpg)

*长窗口里的性能退化。来源：Chroma Research，"Context Rot"，2025 年 7 月。*

这类退化很难只归因于某个产品 bug。LLM 拟合的是自然语言分布，而自然语言里的依赖密度并不均匀。很多句子靠近处上下文就足够预测；需要跨几十页、几十万 token 才能判断的样本少。2021 年一项长程语言模型研究发现，把 2K token 以外的上下文交给长程 Transformer，预测改善主要集中在少量 token 上，常见收益来自远处复制[^5]。2024 年 ACL 的 ProLong 论文进一步把训练样本按 long dependency score 排序，指出直接用长上下文训练并不会自动增强长上下文能力，训练样本里的强长程语义依赖决定了这类训练的效果[^6]。

这些结果把 Agent memory 推向选择问题。一个 Agent 当前窗口里可能同时有用户目标、系统规则、项目约定、工具 schema、搜索结果、代码片段、失败日志、历史摘要和模型自己的计划。容量越大，混进去的噪音也越多。Agent 表现取决于进入窗口的信息是否有用、是否过期、是否互相冲突。

---

## Agent memory 的运行时结构

讨论 Agent memory 时，两个问题经常被放在一起：系统应该记什么，以及信息怎样进出模型窗口。

“记什么”来自认知架构。CoALA 把语言 Agent 的信息存储分为 working memory 和长期记忆，长期记忆又分为 episodic、semantic、procedural：情景记忆保存经历，语义记忆保存事实，程序性记忆保存规则、代码、技能或模型参数[^7]。LangChain / LangGraph 的 memory 文档也采用了类似划分：短期 memory 跟随当前 thread，长期 memory 跨 session 保存；长期部分再按 semantic、episodic、procedural 区分[^8]。2024 年关于 LLM Agent memory 的 survey，以及 2025 年长期记忆评测，也都把 memory 视为支撑长期交互和复杂任务的核心模块，并继续围绕语义、情景、程序性记忆做比较[^9]。

这些文献先回答“记什么”：事实、经历、规则、偏好、技能，各自有不同的更新频率和使用方式。架构图还要处理另一件事：信息放在哪里，以及由谁控制它的流动。CoALA 对这一点有清晰划分：working memory 和 long-term memory 是 memory store；retrieval 从 long-term memory 取内容放进 working memory，reasoning 读写 working memory，learning 把结果写回 long-term memory[^7]。

“怎样进出窗口”来自系统实现。Generative Agents 的 memory stream、检索与 reflection，MemGPT / Letta 的 working context 与 archival memory，LangChain / LangGraph 的 short-term thread state 与 long-term store，都采用了类似分工：当前窗口只保留本轮要用的材料，长期材料留在窗口外，检索、写入和压缩由运行时逻辑完成[^1][^8][^19]。

本文把这些实现整理成图里的三部分：活跃上下文、持久化记忆、记忆控制器。

活跃上下文决定模型这一轮能直接使用什么；持久化记忆保存可回查、可审计的长期材料；记忆控制器接收输入事件，执行检索、排序、压缩、写入、过期和审计策略。

![Agent memory 运行时结构：输入事件进入记忆控制器，控制器装配活跃上下文，并维护持久化记忆。](/images/blog/agent-system-design-2026/agent-memory-stack.svg)

*示意图：输入事件进入记忆控制器；控制器装配活跃上下文，维护持久化记忆。*

活跃上下文包括每一轮进入模型的文本材料，也包括 attention state、KV cache 这类推理时保留的运行状态。它通常跟随一个 Agent、一段会话或一次推理请求。

持久化记忆包括窗口外的文件、数据库、全文索引、vector store、图谱、日志和技能库。认知分类里的情景记忆、语义记忆，以及程序性记忆中可以显式保存的部分，大多在这里落地。它的价值来自可回查的来源、时间、权限和版本记录。

记忆控制器处理输入事件流：用户 prompt、模型输出、工具结果、网页内容、日志、测试结果、人工反馈。它会过滤、标注、检索、压缩和路由这些材料；一部分被装配进活跃上下文，另一部分写入持久化记忆。检索时，持久化记忆里的候选材料也先回到控制器，再被排序、裁剪和装配进上下文。

---

## 活跃上下文：模型窗口和 KV cache

活跃上下文是 Agent 当下能直接使用的状态。它分成两类：明文上下文和运行时缓存。明文上下文包括系统提示、开发者规则、当前目标、检索片段、工具结果、错误日志和模型自己的计划；运行时缓存包括 prompt cache 和 KV cache。长窗口让活跃上下文变大，也让噪音更容易混进来。

Transformer 在生成每个 token 时，会为每一层保存 key/value。下一步生成时，复用这些 KV cache 可以少算大量历史部分。它最早被看成推理加速技术。长上下文、RAG、多轮 Agent 起来以后，KV cache 开始进入 memory 讨论：它保存文本之外的东西，保存模型已经算过的注意力状态。

成本随上下文一起增长。上下文越长，KV cache 越大；batch 越多，GPU 内存越紧。vLLM 的 PagedAttention 把 KV cache 分页管理，减少碎片和重复拷贝[^10]。prefix caching 复用相同前缀，适合系统 prompt、固定工具说明和长文档开头。CacheBlend 处理另一种情况：RAG 找回来的 chunk 往往来自不同位置，prefix caching 很难直接复用，系统需要把多个 chunk 的预计算 KV cache 融合起来，只重算少量 token[^11]。LMCache 则把 KV cache 做成跨 engine、跨 query 的存储和传输层[^12]。

![KV cache 从基本缓存走向运行时记忆。](/images/blog/agent-system-design-2026/kv-cache-memory-roadmap.svg)

*示意图：KV cache 正在从“推理加速”进入“运行时记忆治理”。*

后续工作把 KV cache 治理拆成保留、压缩和分层存储几件事。H2O、StreamingLLM、SnapKV、PyramidKV 这类方法尝试判断哪些 token 的 KV 更值得保留，哪些可以淘汰或压缩；KIVI 等方法用量化降低 KV cache 的存储成本[^13]。TTKV、KVDrive 这类 2026 年工作进一步把 KV cache 放到更长时间和更深存储层里讨论：哪些 cache 留在 HBM，哪些迁到 DRAM 或 SSD，什么时候恢复，什么时候失效[^14]。

KV cache 会和 RAG 长期分工。它绑定模型、prompt、位置、精度和 tokenizer，难以解释，也难以跨模型迁移。它适合保存活跃上下文的底层运行状态；可审计的长期记忆仍要依赖文本、来源和权限记录。

活跃上下文回答“模型此刻能算什么”。这些材料从哪里来、是否可信、下次怎么找回，要交给持久化记忆和记忆控制器。

---

## 持久化记忆：窗口外的库

持久化记忆把长期材料放到窗口外。它可以是 Markdown 文件、JSON profile、SQLite、SQL 表、全文索引、vector store、图数据库，也可以是仓库里的技能、规则和脚本。

认知分类里的三类长期记忆，放到持久化记忆里会变成不同材料。情景记忆是会话历史、daily notes、工具轨迹、操作日志、失败记录；语义记忆是用户偏好、项目事实、公司知识库、产品定义；程序性记忆是 `AGENTS.md`、`CLAUDE.md`、skills、workflow、工具调用模板和团队约定。

Claude Code 用 `CLAUDE.md` 保存项目、用户或组织级规则，也支持 auto memory，把 Claude 从纠正和偏好里学到的内容写成 notes；大型项目里，规则可以拆到 path-scoped 文件或 skills，按需要进入上下文[^15]。Codex 把仓库里的 `AGENTS.md`、skills、memories、workflows 和 MCP 连接器放在不同范围里，分别承担项目规则、可复用流程、用户偏好、长期任务和外部工具连接[^16]。

Skill 库更接近程序性记忆。Claude Code 文档说明，skill 的正文只在使用时加载；Codex 文档把这叫 progressive disclosure：启动时进入上下文的是 skill 名称、描述和路径，完整 `SKILL.md` 在选中后才读入[^15][^16]。对 memory 系统来说，skill 库保存的是可复用做法，记忆控制器负责判断当前任务需不需要把某个做法装进窗口。

Hermes Agent 用 `MEMORY.md` 和 `USER.md` 保存少量高价值常驻信息，把历史会话放进 SQLite/FTS5，再用 `session_search` 取回[^17]。OpenClaw 把 `MEMORY.md`、daily notes、`memory_search` 和 context engine 分开：`MEMORY.md` 保存耐久事实，daily notes 保存工作轨迹，memory search 负责语义/关键词检索，context engine 决定每次模型运行前怎么组装上下文[^18]。Letta/MemGPT 更早把 LLM 的上下文管理类比成操作系统里的内存分页：当前窗口有限，外部记忆需要主动换入换出[^19]。

这些系统都把长期材料从聊天历史里拆了出来。模型每轮看到的是当前任务需要的切片，完整材料留在外部库里。

持久化记忆的难点随后落到检索方式上。向量检索适合语义相近但措辞不同的资料，关键词检索适合命令、错误码、函数名、专有名词，SQL 适合带时间、状态、权限和实体关系的记录。生产系统通常会混用这些方式；把所有记忆都交给一种检索方式，后面会在召回率、权限和可解释性上付出成本。

---

## 记忆控制器：信息怎么进出窗口

在这张运行时图里，记忆控制器指一组操作：标准化输入、检索候选、排序、压缩、写入、过期和审计。持久化记忆保存材料，记忆控制器决定材料怎样进入活跃上下文，以及哪些新材料值得长期保存。

RAG 是最常见的检索操作。文件被切成片段，片段进入向量库，查询时找回相近内容，再把候选片段放进模型窗口。这个流程看起来简单，效果常常输在细节。

片段切得太短，模型拿到的是断句和孤立事实；切得太长，检索结果本身变成噪音。只做语义检索，错误码、函数名、专有名词容易漏；只做关键词检索，改写过的问题又找不到。缺少 rerank，相关片段会被相似但无用的材料挤下去。缺少时间和来源，模型分不清新旧事实。缺少权限和租户边界，检索结果可能从安全问题变成产品事故。

Anthropic 在 2024 年提出 Contextual Retrieval，给每个 chunk 加上文档级上下文，再结合 BM25、embedding 和 reranker，处理 chunk 离开原文后失去背景的问题[^20]。OpenAI 的 File Search 也把 query rewriting、多路检索、关键词/语义搜索和 reranking 包进工具里[^21]。这些工程细节决定 RAG 最后提供的是记忆还是噪音。

一个 Agent 找回来的材料，需要说明它来自哪份文档、写于什么时候、和当前任务是什么关系、能否继续回查原文。缺少这些信息，检索只是把不确定性搬进窗口。前面的长上下文评测已经说明，窗口里的噪音仍会占掉注意力。

写入和压缩同样重要。Generative Agents 用 reflection 把低层观察合成高层记忆。MemoryBank 借用艾宾浩斯遗忘曲线，把用户信息按重要性和时间衰减[^22]。Claude Code、Hermes 和 OpenClaw 在会话压缩前触发记忆写入，先把长期事实从短期状态里挑出来。Context-Folding、U-Fold 等研究则试图让模型学会何时把局部轨迹折叠回主上下文[^23]。

![Context-Folding：Agent 分叉到临时子轨迹，中间步骤折叠成摘要回到主上下文。](/images/blog/agent-system-design-2026/context-folding-example.jpg)

*分支-折叠机制：局部子任务在临时上下文探索，结束后折叠为摘要。来源：Context-Folding 项目页面，2025 年 10 月。*

遗忘也要作为操作来设计。一个长期工作的 Agent 会不断遇到用户改主意、项目换方向、旧 bug 被修掉、接口被废弃、权限被撤销。旧事实如果一直以同等权重留在系统里，后续任务就会被污染。很多记忆需要降权、过期、归档、标记来源，或者保留原始证据但撤销摘要里的结论。

Loop engineering 处理另一类控制问题：一轮轮任务如何留下可检查状态，包括目标、计划、测试结果、失败原因、下一步动作。Claude Code 把 `/loop` 做成 bundled skill；Codex workflows 则要求每个流程写清 context notes 和 verification[^15][^16]。循环被写成 skill、workflow 或脚本后，聊天历史不再承担全部状态，控制器每轮只装配当前需要的材料。

工具调用也受这组操作影响。传统 MCP 调用有两个上下文成本。第一，工具定义本身占窗口。几个 MCP server 加起来，schema 可能先吃掉几万 token。第二，中间结果会直接进入模型上下文。一个工具返回 10,000 行日志，模型实际需要的也许只有过滤后的 5 行。

2025 年底，Anthropic 提出一个替代方案：把 MCP server 暴露成文件系统里的类型化代码模块，让 Agent 写代码在沙箱里调用、过滤、聚合，最后只把必要结果打印回模型[^24]。在他们给出的例子里，一个工作流的上下文消耗从约 150K token 降到 2K token。

![传统 MCP：所有工具定义和中间结果全部进入模型上下文。代码执行版：MCP 暴露为文件系统中类型化代码模块。](/images/blog/agent-system-design-2026/mcp-code-exec.png)

*代码执行把中间过程留在沙箱里，只把过滤后的结果放回模型窗口。来源：Anthropic，"Code Execution with MCP"，2025 年 11 月。*

这类方案把一部分记忆从 prompt 移到运行时。循环、过滤、聚合、临时文件、局部变量都留在沙箱里，模型只读最后结果。代价落在安全边界上：Agent 写出来的代码是不可信代码。只要输入里有网页、仓库、用户上传文件、第三方 API 响应，就要假设生成代码可能被 prompt injection 影响。

沙箱、权限和审计因此也进入 memory 系统。Agent 记住了什么、调用过什么、从哪里拿到结果、哪些中间状态留在模型窗口外，都要能追踪。

---

## 多 Agent：共享库和低带宽协议

用这张运行时图看跨 Agent：每个 Agent 有自己的活跃上下文；团队共享的部分通常是持久化记忆、任务数据库、artifact 目录和测试日志。多个 Agent 一起工作，分工很快会变成共享记忆问题。

2025 年 6 月 12 日，Cognition 发了 **"Don't Build Multi-Agents"**，提醒开发者注意多 Agent 之间决策分散、上下文难以共享的问题[^25]。第二天，Anthropic 发了 **"How We Built Our Multi-Agent Research System"**，展示它们在研究任务里用主导 Agent 派生多个子 Agent 并行搜索，但也写了限制。Anthropic 原文写得更直接：**"some domains that require all agents to share the same context or involve many dependencies between agents are not a good fit for multi-agent systems today."** 换成中文说，如果一个领域要求所有 Agent 共享同一批上下文，或者 Agent 之间存在很多依赖关系，今天的多 Agent 系统并不合适[^26]。

两篇文章都把边界指向同一个条件：上下文能否被拆开。多 Agent 的成败，取决于多个上下文之间的信息交换质量，而非 Agent 数量本身。

2026 年 4 月，Tran 和 Kiela 用多跳推理任务做了更直接的对照。他们把 thinking token 预算拉平后发现，单 Agent 可以匹配甚至超过多 Agent。论文借用数据处理不等式解释这个问题：信息经过压缩、转述、传递，互信息上限只会下降[^27]。一个子 Agent 返回摘要，也会丢信息。worker、subagent、tool agent 这些名字改变不了这笔损耗。

![Anthropic 多 Agent 研究架构：主导 Agent 接收查询、规划，派生专门子 Agent 并行搜索，各子 Agent 独立上下文窗口。](/images/blog/agent-system-design-2026/multi-agent-arch.png)

*Orchestrator-worker 模式：主导 Agent 拆解查询，子 Agent 在隔离上下文中并行搜索。来源：Anthropic Engineering，2025 年 6 月。*

多个 Agent 可以共享同一个持久化记忆库，比如文档库、任务数据库、artifact 目录或测试日志。活跃上下文和 KV cache 通常不能完整共享；Agent 之间只能通过有限带宽交换符号：摘要、结构化字段、artifact、引用、状态机、测试结果、原文链接。这套工作语言需要保留证据回查路径，避免只交接前一个 Agent 的判断。

生产里的多 Agent 因而更适合搜索、验证、批量分析这类局部任务。子 Agent 的收益来自额外窗口、并行工具调用和噪音隔离；损失来自摘要通信、协调成本和失败追踪。任务如果高度依赖共享可变状态，多个 Agent 往往先增加协调混乱。

---

## 记忆系统需要治理

当输入事件、活跃上下文、持久化记忆和记忆控制器分开后，Agent memory 已经很难再被当成一个单独功能。

窗口、attention、KV cache、prompt cache 决定模型这一轮能处理什么。窗口外的持久化记忆决定什么材料可以长期保存、检索和审计。写入、检索、压缩、遗忘、沙箱过滤和审计，决定信息怎么进出窗口。跨 Agent 共享则决定哪些材料进入共享库，哪些只能被压成可回查的符号和 artifact。

成熟系统通常会把材料按位置和用途放好：稳定规则进 `AGENTS.md` 或 `CLAUDE.md`，技能按需加载，历史会话进 session search，文档库进 hybrid retrieval，长任务通过 compaction 和 workflow 延续，工具中间结果留在沙箱里。多 Agent 只在任务可拆、上下文可隔离、收益足够覆盖通信损失时使用。

剩下的工作集中在四件事：Agent 需要知道一条记忆什么时候写入、降权、撤销；RAG 需要证明找回来的片段有用；多 Agent 需要一套可回查的共享语言；KV cache 需要被压缩、迁移、复用，也要有失效边界。

人类记忆无法成为完整录像。它分层、依赖线索、会遗忘，也会在需要时重构。这个类比不能直接变成工程方案，却提醒 Agent memory 不能把目标设成无限保存。

工程里的考验会出现在一次长任务的后半段：任务跑到第 40 轮，用户改过三次目标，工具返回过几万行日志，模型做过两次错误假设，系统还能不能说清楚当前状态从哪里来，哪些证据仍然可靠，哪些记忆应该被撤销。这决定 Agent 能不能长期工作。

---

[^1]: Joon Sung Park et al., "Generative Agents: Interactive Simulacra of Human Behavior," arXiv 2304.03442, 2023. https://arxiv.org/abs/2304.03442
[^2]: Nelson F. Liu et al., "Lost in the Middle: How Language Models Use Long Contexts," arXiv 2307.03172, 2023. https://arxiv.org/abs/2307.03172
[^3]: "Found in the Middle" and RULER/LongBench long-context evaluations, 2024. https://arxiv.org/abs/2406.16008 ; https://arxiv.org/abs/2404.06654 ; https://arxiv.org/abs/2308.14508
[^4]: K. Hong, A. Troynikov, J. Huber, "Context Rot: How Increasing Input Tokens Impacts LLM Performance," Chroma Research, July 14, 2025. https://research.trychroma.com/context-rot
[^5]: Simeng Sun, Kalpesh Krishna, Andrew Mattarella-Micke, Mohit Iyyer, "Do Long-Range Language Models Actually Use Long-Range Context?" EMNLP 2021. https://arxiv.org/abs/2109.09115
[^6]: Longze Chen et al., "Long Context is Not Long at All: A Prospector of Long-Dependency Data for Large Language Models," ACL 2024. https://aclanthology.org/2024.acl-long.447/
[^7]: Theodore R. Sumers et al., "Cognitive Architectures for Language Agents," arXiv 2309.02427, 2023. https://arxiv.org/abs/2309.02427
[^8]: LangChain Docs, "Memory overview"; LangMem Docs, "Long-term Memory in LLM Applications." https://docs.langchain.com/oss/python/concepts/memory ; https://langchain-ai.github.io/langmem/concepts/conceptual_guide/
[^9]: Zeyu Zhang et al., "A Survey on the Memory Mechanism of Large Language Model based Agents," arXiv 2404.13501, 2024; Alessandra Terranova et al., "Evaluating Long-Term Memory for Long-Context Question Answering," arXiv 2510.23730, 2025. https://arxiv.org/abs/2404.13501 ; https://arxiv.org/abs/2510.23730
[^10]: Woosuk Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention," arXiv 2309.06180, 2023. https://arxiv.org/abs/2309.06180
[^11]: Yiwen Hu et al., "CacheBlend: Fast Large Language Model Serving with Cached Knowledge Fusion," arXiv 2405.16444, 2024. https://arxiv.org/abs/2405.16444
[^12]: LMCache project and paper, 2025. https://arxiv.org/abs/2510.09665
[^13]: H2O, StreamingLLM, SnapKV, PyramidKV, and KIVI: KV cache eviction, streaming, compression, and quantization research, 2023-2024. https://arxiv.org/abs/2306.14048 ; https://arxiv.org/abs/2309.17453 ; https://arxiv.org/abs/2404.14469 ; https://arxiv.org/abs/2406.02069 ; https://arxiv.org/abs/2402.02750
[^14]: TTKV and KVDrive, 2026 KV cache tiering / storage-management work. https://arxiv.org/abs/2604.19769 ; https://arxiv.org/abs/2605.18071
[^15]: Anthropic, Claude Code Docs, "Memory," "Skills," "Context Window," and "Scheduled Tasks." https://code.claude.com/docs/en/memory ; https://code.claude.com/docs/en/skills ; https://code.claude.com/docs/en/context-window ; https://code.claude.com/docs/en/scheduled-tasks
[^16]: OpenAI, Codex Docs, "AGENTS.md," "Agent Skills," "Memories," and "Workflows." https://developers.openai.com/codex/guides/agents-md ; https://developers.openai.com/codex/skills ; https://developers.openai.com/codex/memories ; https://developers.openai.com/codex/workflows
[^17]: Nous Research, Hermes Agent Docs and repository. https://hermes-agent.nousresearch.com/ ; https://github.com/nousresearch/hermes-agent
[^18]: OpenClaw Docs, "Memory" and "Context Engine." https://docs.openclaw.ai/concepts/memory ; https://docs.openclaw.ai/concepts/context-engine
[^19]: Charles Packer et al., "MemGPT: Towards LLMs as Operating Systems," arXiv 2310.08560, 2023. https://arxiv.org/abs/2310.08560 ; Letta Docs, memory blocks and archival memory. https://docs.letta.com/
[^20]: Anthropic, "Introducing Contextual Retrieval," September 2024. https://www.anthropic.com/news/contextual-retrieval
[^21]: OpenAI Platform Docs, "File Search." https://platform.openai.com/docs/guides/tools-file-search
[^22]: Zhong et al., "MemoryBank: Enhancing Large Language Models with Long-Term Memory," arXiv 2305.10250, 2023. https://arxiv.org/abs/2305.10250
[^23]: Sun et al., "Context-Folding: Context Management for Efficient Agentic Reasoning," arXiv 2510.11967, 2025; "U-Fold: Universal Context Folding for Long-Context Reasoning," arXiv 2601.18285, 2026. https://arxiv.org/abs/2510.11967 ; https://arxiv.org/abs/2601.18285
[^24]: Anthropic Engineering, "Code execution with MCP: building more efficient agents," November 4, 2025. https://www.anthropic.com/engineering/code-execution-with-mcp
[^25]: Walden Yan, "Don't Build Multi-Agents," Cognition Blog, June 12, 2025. https://cognition.ai/blog/dont-build-multi-agents
[^26]: Anthropic Engineering, "How we built our multi-agent research system," June 13, 2025. https://www.anthropic.com/engineering/multi-agent-research-system
[^27]: Dat Tran, Douwe Kiela, "Single-Agent LLMs Outperform Multi-Agent Systems on Multi-Hop Reasoning Under Equal Thinking Token Budgets," arXiv 2604.02460, April 2026. https://arxiv.org/abs/2604.02460

*文中图片来自 Chroma Research、Anthropic Engineering、Context-Folding 项目页，以及本文自制示意图。模型和评测结果来自各论文、厂商博客或项目文档截至 2026 年中的公开材料，未独立复现的数字应按论文或厂商自报理解。*
