---
title: '为什么机器人还只是一个遥控大玩具'
description: '从动作标签中的缺失信息，到人类视频的迁移效果和闭环评测成本，讨论机器人模型的泛化为什么仍然困难。'
pubDate: 2026-08-16
tags: [embodied-ai, robotics, VLA, scaling, world-models]
locale: zh
---

## 机器人的泛化难题

2026 年 8 月，Dyna Robotics 公布了一组实验室与客户现场的对照。在内部评测中，Dyna-1 和 Dyna-2 都接近 100% 达标；放到训练时没见过的客户场地，按客户对质量、效率和可靠性的要求验收，两者的通过率分别是 46% 和 87%。两代模型使用了相同的任务后训练数据和训练步数。<sup><a href="#ref-1">[1]</a></sup>

这组结果既显示了进步，也说明了机器人泛化的困难。在训练场景学会一套演示动作之后，机器人还要适应不同的场地、物体和操作条件。

在日常家务中。拿起杯子，需要选抓取位置、判断杯子是否会滑、在接触后调整力度，这些都可能遇到训练中没有见过的场景。模型即使“认得杯子”、“理解”拿起来这条指令，也可能在执行中失败。

我们在这里讨论其中的动作学习难以泛化的问题：为什么语言模型，视频生成模型支持很好的泛化，而动作模型依然受限，演示数据提供了什么，训练误差遗漏了什么，以及扩大训练规模后，哪些改进能够保留到实际操作中。硬件价格、安全要求和维护成本也影响家用机器人的普及，本文不展开这些因素。

## VLA 与 WAM

视觉-语言-动作模型（VLA）把摄像头画面、语言指令和机器人自身的状态作为输入，生成动作。许多 VLA 继承了大规模预训练的视觉语言模型，再增加动作输出模块。动作可以表示为末端执行器的位姿变化、关节目标或一段连续轨迹，由控制器转换为执行指令。<sup><a href="#ref-2">[2]</a>，<a href="#ref-3">[3]</a>，<a href="#ref-4">[4]</a></sup>

世界-动作模型（WAM）还学习预测未来的观测。以 Dyna-2 为例，视频和动作使用不同的表示与网络模块，并通过注意力交互；用于规模实验的模型同时接受视频预测和动作预测训练。视频任务能够影响共享表示，实际控制时则可以直接生成动作。<sup><a href="#ref-1">[1]</a></sup>

这些模型广泛采用行为克隆：记录演示者完成任务时的观测与动作，让模型学习从观测预测动作。数据可以由人遥操作机器人采集，也可以来自手持夹爪、可穿戴设备或人类操作视频。后几种方式减少了对机器人本体的依赖，同时带来了动作标注和跨本体迁移的问题。

强化学习通过行动后的奖励改进策略，可以使用仿真或真实机器人的交互数据。它与行为克隆也能结合：用演示得到初始策略，再用策略自己的执行记录、纠正和奖励继续训练。<sup><a href="#ref-5">[5]</a></sup>

预训练、模仿与交互各自提供不同的经验。视觉语言模型学过大量物体与概念，动作模块需要把这些知识用于具体身体和任务。迁移能做到多少，要在新的物体、布局和任务上测量。视觉编码器本身也可能失效，动作模块与主干之间的训练还可能相互干扰，不能把所有失败都归给同一个部件。<sup><a href="#ref-6">[6]</a>，<a href="#ref-7">[7]</a></sup>

## 机器人的规模定律

语言模型的规模定律提供了一个有吸引力的参照。Kaplan 等人在 2020 年发现，在所研究的范围内，语言模型的测试损失随模型规模、数据量和计算量呈现较稳定的幂律关系。<sup><a href="#ref-8">[8]</a></sup> 后来的 Chinchilla 研究进一步讨论了固定计算预算下，参数量与训练数据如何配比。<sup><a href="#ref-9">[9]</a></sup>

把数据规模与损失的关系简写为：

<p style="text-align:center;"><em>L(D) ≈ k · D<sup>−α</sup> + L<sub>∞</sub></em></p>

这里，<em>D</em> 是数据量，<em>α</em> 描述可改善部分随数据增长而下降的速度，<em>k</em> 决定其量级，<em>L<sub>∞</sub></em> 是拟合中的渐近损失项。数据每翻一倍，<em>L(D) − L<sub>∞</sub></em> 就乘以 <em>2<sup>−α</sup></em>。在双对数坐标上呈直线关系的是这部分可改善的损失；把非零的渐近项也算进去，曲线会逐渐变平。

机器人研究正在检验类似关系，但“数据量”包含了差别很大的材料。RoboTurk 公布过 111 小时遥操作数据，DROID 约 350 小时，AgiBot World 约 2,976 小时。Qwen-RobotManip 对九个主要开源机器人数据集的统计合计约 11,000 小时。<sup><a href="#ref-10">[10]</a>，<a href="#ref-11">[11]</a>，<a href="#ref-12">[12]</a>，<a href="#ref-13">[13]</a></sup> Dyna-2 的预训练规模则超过一百万小时，主要来自第一人称人类操作视频。<sup><a href="#ref-1">[1]</a></sup>

![机器人动作数据集与人类操作数据的公开小时数，按发表年份绘于对数坐标](/images/blog/action-bottleneck/fig-datacurve.svg)

*不同采集方式的数据规模。橙色为机器人动作记录，蓝色为人类操作数据。<sup><a href="#ref-10">[10]</a>，<a href="#ref-11">[11]</a>，<a href="#ref-12">[12]</a>，<a href="#ref-14">[14]</a>，<a href="#ref-15">[15]</a>，<a href="#ref-16">[16]</a>，<a href="#ref-17">[17]</a>，<a href="#ref-18">[18]</a>，<a href="#ref-19">[19]</a></sup> 数据来源、传感器和标注方式各不相同；图中的趋势线仅描述这些公开样本，不代表行业整体增长率。百万小时商业语料与开源数据集总量也不构成同口径比较。*

一小时人类视频与一小时机器人遥操作数据，能提供的动作监督不同。前者往往要从手腕轨迹、手指距离或设备读数中提取动作；后者记录的是指定机器人执行任务时的指令和状态。小时数能够反映采集规模，还需要结合标注质量、任务覆盖和身体差异判断训练价值。

模型参数量也有类似限制。GR00T N1 为 2.2B，π0 约 3B，OpenVLA 为 7B；RT-2 曾使用 55B 主干。<sup><a href="#ref-20">[20]</a>，<a href="#ref-4">[4]</a>，<a href="#ref-3">[3]</a>，<a href="#ref-2">[2]</a></sup> OpenVLA 在论文评测中超过了更大的 RT-2-X，但两者的数据与训练方案不同，不能据此单独判断参数规模的作用。机器人还受到控制频率和推理延迟的约束，扩大模型要同时考虑执行速度。<sup><a href="#ref-7">[7]</a></sup>

Dyna-2 的消融更直接地考察了训练目标。研究者从带手部姿态标注的人类视频中提取伪动作，使用 5,000、50,000 和 100,000 小时数据，比较仅预测动作、联合预测视频与动作，以及额外加入无动作标注视频的训练方式。在 39 个机器人任务的零样本离线评测中，仅动作训练出现了严重且不稳定的过拟合；加入额外视频预测数据后，跨本体迁移才随数据量增长而稳定改善。<sup><a href="#ref-1">[1]</a></sup>

这项结果说明，在这套数据、架构与评测条件下，训练目标和数据组成影响了规模收益。要解释原因，需要进一步看动作标签本身。

## 动作预测的误差来源

一次机器人演示可以记为：

<p style="text-align:center;"><em>τ = (o<sub>1</sub>, a<sub>1</sub>, o<sub>2</sub>, a<sub>2</sub>, …, o<sub>T</sub>)</em></p>

<em>o<sub>t</sub></em> 是第 <em>t</em> 步的观测，例如画面、关节角、夹爪状态和力传感器读数；<em>a<sub>t</sub></em> 是记录的动作。为了讨论信息缺失，可以把演示者的动作简写为：

<p style="text-align:center;"><em>a<sub>t</sub> = π(x<sub>t</sub>, z<sub>t</sub>) + ε<sub>t</sub></em></p>

<em>x<sub>t</sub></em> 是模型能使用的输入，包括观测历史与任务指令；<em>z<sub>t</sub></em> 表示演示者掌握、输入却没有完整记录的信息，例如绕行意图、操作习惯或接触感受；<em>ε<sub>t</sub></em> 表示指令中的扰动。这是分析用的简化分解。

物理过程还需要区分真实状态与传感器观测：

<p style="text-align:center;"><em>s<sub>t+1</sub> = F(s<sub>t</sub>, a<sub>t</sub>, ξ<sub>t</sub>), &nbsp; o<sub>t</sub> = g(s<sub>t</sub>) + ν<sub>t</sub></em></p>

其中，<em>s<sub>t</sub></em> 包含系统的物理状态，<em>ξ<sub>t</sub></em> 与 <em>ν<sub>t</sub></em> 分别表示动力学扰动和观测噪声。摄像头通常无法记录完整状态。即使物理过程在完整状态下是确定的，只看图像的模型仍可能面对多种未来。

文中的二维仿真把这些因素缩小到一个绕障任务。<sup><a href="#ref-21">[21]</a></sup> 模拟机械臂从起点移向目标，每条演示随机选择绕行侧，并带有转弯早晚的风格差异与指令抖动。机械臂有惯性，实际运动经过低通滤波。两个模型接收相同的最近两次位置：一个预测下一位置，另一个预测原始动作指令。下文把前者称为“观测预测头”，它对应图中的 vision head，与 VLA 中预训练的视觉编码器有所区别。

![二维绕障仿真：演示轨迹在障碍物两侧分叉，原始指令经过惯性滤波后形成较平滑的位置变化](/images/blog/action-bottleneck/fig-setup.svg)

*左图显示不同绕行侧与转弯风格，右图比较原始指令和执行后的运动。两种预测使用相同的位置历史，均未直接接收当前动作、绕行选择和风格参数。*

<details>
<summary>仿真的单步更新与模型设置</summary>

```python
# 每个回合隐藏的变量：side（绕行侧）、turn_dist（转弯距离）。
if x < OBS_X and (OBS_X - x) < turn_dist and abs(y) < 1.0:
    target = (x + 0.5, side * 1.2)
else:
    target = GOAL
d = unit_vector(target - pos)
cmd = SPEED * d + gauss(0, 0.05)
exec_v = 0.6 * exec_v + 0.4 * cmd
pos = pos + exec_v

# 两种预测均使用最近两个位置：
# 观测预测头：pos_next
# 动作预测头：cmd
# 最近邻：200 个训练回合、200 个验证回合。
# 小型 MLP：4 -> 240 tanh -> 2；另做 8 与 200 回合的对照。
```

这段代码展示单步更新。文中的数值来自作者的仿真实验；完整训练、采样和统计脚本尚未随文提供。<sup><a href="#ref-21">[21]</a></sup>

</details>

这个仿真用于考察隐藏变量、惯性和训练样本如何影响误差。它不包含图像编码、复杂接触或真实机器人控制，具体倍数只适用于这套设置。

### 隐藏意图与接触信息

两个人在同一位置绕过障碍物，一个选左侧，一个选右侧。在分叉发生前，两段位置历史可以完全相同。如果模型只收到“到达目标”这条指令，就无法确定演示者会选哪一侧。

增加输入有时能减少这种不确定性。指令可以明确要求左绕，历史也可能显示已经开始的转弯。但若某个选择独立于已记录的历史，又没有写进指令，继续增加同类记录仍无法预测那一次选择。

对于离散化的动作，条件熵描述了给定输入后剩余的不确定性：

<p style="text-align:center;"><em>H(a | x) = H(a) − I(a; x)</em></p>

在平方误差下，可以更直接地定义预测下限。先用归一化均方误差衡量预测结果：

<p style="text-align:center;"><em>NMSE = E‖ŷ − y‖² / Var(y), &nbsp; B = E[Var(y | x)] / Var(y)</em></p>

向量目标的 <em>Var</em> 在这里表示各维方差之和。<em>B</em> 是给定输入与数据分布下，确定性预测器所能达到的最小期望 NMSE，由条件均值预测器达到。它约束的是新样本上的平均表现；有限验证集上的测量值还会有抽样波动。图中把这个下限标为 floor。

用最近邻模型分别拟合两种目标，200 个训练回合上都可以达到零误差。换成 200 个新回合，动作 NMSE 为 0.631，观测 NMSE 为 0.0033。两者相差约 190 倍，但各自的归一化分母不同，这个倍数不能直接解释成泛化能力差距。

逐项移除隐藏变量，可以进一步比较：

| 仿真条件 | 动作 NMSE | 观测 NMSE |
|---|---:|---:|
| 隐藏绕行侧、风格和抖动 | 0.62 | 0.003 |
| 仅保留指令抖动 | 0.36 | 0.002 |
| 仅保留隐藏决策 | 0.28 | 0.001 |
| 保留全部隐藏因素，改为预测执行后的速度 | 0.22 | 0.003 |

*这些结果来自作者的仿真。<sup><a href="#ref-21">[21]</a></sup> 0.62 与前述 0.631 来自不同运行。表中报告的是预测误差，不能直接当作不可约误差下限；改变目标后，归一化分母也会变化。*

关闭指令噪声后，隐藏的绕行决策仍会造成预测误差。把预测目标改为执行后的速度，数值也明显下降：惯性削弱了指令中的高频成分。这支持继续比较不同动作表示，但是否改善控制，还需要把策略放进任务中测试。

![仿真中的信息传递：隐藏决策和抖动影响动作指令，指令经惯性滤波影响下一次观测](/images/blog/action-bottleneck/fig-chain.svg)

*两种目标都受到隐藏变量影响。图中的动作下限约 0.29 来自局部条件方差估计；观测侧的 0.0027 是新输入项的方差占比，用于讨论误差尺度，不能与前者作为同一种测量直接比较。*

真实操作中，缺失信息还包括重量、摩擦、柔顺性、遮挡下的接触位置，以及演示者感受到的力。外观相近的两个杯子可能需要不同的握力，单一视角也未必能及时显示初滑。FACT 对接触密集任务的分析区分了力控制失败与其他视觉、位置精度问题。<sup><a href="#ref-22">[22]</a></sup>

触觉和力反馈能够补充这类观测，但采集规模仍有限。T-Rex 报告了约 100 小时触觉操作数据，与百万小时视频语料相差很大。<sup><a href="#ref-23">[23]</a></sup> 具体任务对触觉的依赖程度不同；视觉中的形变、运动历史和主动试探也能提供部分物理信息。

接触还会放大未观测的微小差异。在文中的粘滑仿真中，摩擦参数变动 ±1%，系统接近静摩擦阈值时，位移结果的散布约为平滑阻尼对照的 83 倍；远离阈值后，差异大幅减弱。<sup><a href="#ref-21">[21]</a></sup> 83 倍是这套仿真的结果，不能换算为真实机器人误差的统一放大率。平面推物的硬件研究也测到了重复相近操作时的结果分布。<sup><a href="#ref-24">[24]</a></sup>

因此，接触任务会同时增加动作与观测预测的难度。模型缺少物体状态时，下一帧也未必好预测。本文仿真中较低的观测误差，不能推广成“视觉掌握了全部物理信息”。

### 平均误差的盲区

二维仿真的下一位置，可以拆成历史运动带来的可预测部分，以及当前指令引起的新增变化：

<p style="text-align:center;"><em>o<sub>t+1</sub> = m(x<sub>t</sub>) + c · u<sub>t</sub></em></p>

<em>m(x)</em> 包含当前位置和惯性运动，<em>u</em> 表示当前输入项，仿真中的滤波系数 <em>c = 0.4</em>。这个输入项可能有可预测成分，不能一概视为纯随机噪声。

如果只考察 <em>u</em> 的预测误差，它对完整位置 NMSE 的贡献满足：

<p style="text-align:center;"><em>NMSE<sub>full, u</sub> = NMSE<sub>u</sub> × c² Var(u) / Var(o<sub>t+1</sub>)</em></p>

这个关系假定单独比较输入项；完整预测的误差还可能包含 <em>m</em> 的误差及交叉项。它说明，新增变化在总方差中占比很小时，即使模型没有准确预测这部分，整体 NMSE 仍然可以很低。

![观测目标与动作目标的方差构成示意，观测中的新增变化只占很小比例](/images/blog/action-bottleneck/fig-dilution.svg)

*图中数值来自二维仿真。0.27% 描述观测目标中新输入项的方差占比；29% 描述动作目标的条件方差占比，两者定义不同。*

文中的重新评分实验把动量成分单独分离，对输入项计算误差。按该分解，两种预测的对应 NMSE 都为 0.618；原先较小的观测总误差约 0.0032，其中约 0.0017 来自输入项，约 0.0015 来自近邻样本之间的动量差异。<sup><a href="#ref-21">[21]</a></sup> 这项计算展示了评分尺度的影响。它不构成两类模型具有相同表征能力的独立证据。

真实视频同样可能存在这种平均效应。一帧图像包含背景、物体和接触区域，整帧平均误差可能不够重视夹爪附近的小范围变化。具体影响取决于相机运动、目标表示、损失权重和任务，不能仅凭像素数量推断视觉损失更容易优化。

视频生成研究也需要处理不确定的未来。确定性预测可能把多种延续平均成模糊画面，随机潜变量模型则可以生成不同的未来样本。<sup><a href="#ref-25">[25]</a></sup> Genie 从未标注视频中学习潜动作表示，为生成过程提供可控变量。<sup><a href="#ref-26">[26]</a></sup> 这些工作说明，视频模型也需要建模决策与不确定性。动作模型使用扩散或流匹配，同样可以学习多峰分布。

### 误差下限与过拟合

预测存在下限，并不要求训练一定过拟合。以平方误差为例，新样本上的风险可以分解为：

<p style="text-align:center;"><em>E‖f̂(x) − y‖² = E[Var(y | x)] + E‖f̂(x) − E[y | x]‖²</em></p>

第一项由给定输入下的目标不确定性决定；第二项反映模型与最优条件均值之间的差距。更多样本、更合适的模型或训练方法可以降低第二项。要降低第一项，则需要改变可用信息、预测目标或数据分布。

过拟合发生在模型对有限训练样本的适应损害了新样本表现时。容量充足的网络可能记住演示中的偶然细节，训练误差继续下降，验证误差开始上升。随机标签实验与关于深度网络记忆过程的研究都观察过相关现象。<sup><a href="#ref-27">[27]</a>，<a href="#ref-28">[28]</a></sup> 但出现不可约误差，并不足以单独证明模型会走上这条训练路径。

文中的小型 MLP 只用八条演示训练了 4,000 个 epoch。观测训练与验证 NMSE 分别达到 0.0014 和 0.0019。动作验证误差在第 45 个 epoch 降到约 0.53，此后回升到约 0.60，训练误差降到约 0.31。<sup><a href="#ref-21">[21]</a></sup>

![八回合训练下的误差曲线：动作验证误差先下降后回升，观测误差较低](/images/blog/action-bottleneck/fig-curves.svg)

*虚线标出的动作下限约 0.29，由仿真中的局部条件方差估计得到。验证误差回升支持过拟合的判断；训练误差是否低于这个估计值，还受到有限样本和估计方法影响。*

再把隐藏的绕行侧与风格交给模型，结果取决于数据量。最近邻模型的动作验证误差从约 0.62 降到 0.38。八回合 MLP 却出现更严重的过拟合：训练误差降到 0.12，验证误差升到 8.7。样本太少时，固定的风格参数可能成为识别某个训练回合的线索。

训练数据扩大到 200 回合后，提供隐藏变量的 MLP 验证误差降到 0.41，未提供隐藏变量的版本为 0.48。<sup><a href="#ref-21">[21]</a></sup> 更多回合扩大了风格与轨迹的覆盖范围，降低了仅靠回合特征记忆的收益。仅凭这些曲线，仍不能确认每个模型具体使用了哪些内部特征。

![隐藏变量可见性与训练回合数的对照：八回合时提供风格变量加重过拟合，200 回合时预测有所改善](/images/blog/action-bottleneck/fig-grid.svg)

*四组结果同时改变输入信息和样本覆盖，显示了两者的相互影响。图中约 0.19 的下限由最近邻结果作近似推断，确定它需要独立的条件方差估计。*

生成式动作头还改变了任务本身。在左右两侧都能绕过障碍物时，确定性回归可能输出两种动作的均值，导致碰撞；分布模型可以选择其中一条可行路径。Diffusion Policy 利用动作分布建模来处理多峰动作。<sup><a href="#ref-29">[29]</a></sup>

此时，机器人无需猜中演示者当时选择的那一侧，仍可以完成任务。离散动作的交叉熵受条件熵约束，但条件熵较高与任务成功率较低之间没有必然对应关系。分布模型也可能过拟合，是否发生、造成多大损失，需要结合训练曲线与执行结果判断。

## 轨迹冗余与有效样本

一条演示可能包含数千帧，但相邻帧通常高度相关。重复记录一次持续动作，可以提高时间分辨率，却未必增加同等数量的独立训练条件。转弯位置、抓取方式、物体摆放和接触反馈的变化，对泛化往往更有帮助。

在绕障仿真中，训练帧数固定在约 170 帧时，把数据从八个回合分散到十六个回合，动作验证误差从 0.85 降到 0.76；增加到三十二个回合后约为 0.75。保持八个回合、只把帧数减半，误差则从 0.85 变为 0.88。<sup><a href="#ref-21">[21]</a></sup>

这组实验说明了轨迹内的冗余，但时间相关性也存在于观测流中，不能把它视为动作数据独有的问题。也不能仅凭“回合数乘以决策数”精确计算有效样本量：连续控制中的纠偏、稳定和接触过程都可能提供新信息。

真实机器人研究给出了更具体的采集依据。Lin、Hu 等人收集了四万多条演示，进行了超过一万五千次真实机器人执行测试，发现环境与物体多样性对泛化的影响大于单纯增加演示条数。在他们考察的条件中，每个环境或物体的演示达到一定数量后，继续重复采集的边际收益明显减弱。<sup><a href="#ref-30">[30]</a></sup>

因此，数据集规模至少应同时报告小时数、独立回合、环境、物体与任务覆盖。训练和验证也需要按回合及目标泛化条件划分，避免把同一段轨迹的相邻帧分到两侧，得到过于乐观的分数。

## 训练与迁移的进展

二维仿真能帮助分离机制，真实系统则要检验这些因素在复杂任务中有多大影响。已有研究分别从训练方式、采集范围和人类数据迁移入手。

### 联合训练与知识保留

Dyna-2 的结果支持视频预测对跨本体迁移的帮助。<sup><a href="#ref-1">[1]</a></sup> 丰田研究院的一项研究则比较了 89 个策略，进行了 58,000 次仿真和 2,835 次真实机器人执行测试。视觉语言数据、轨迹语言标注与跨本体机器人数据等有效组合，改善了分布变化、未见任务和指令跟随表现；仅用机器人数据训练时，主干的视觉语言能力有所退化。<sup><a href="#ref-31">[31]</a></sup>

Physical Intelligence 的 Knowledge Insulation 研究关注动作专家与预训练主干之间的干扰。直接加入未训练的连续动作模块，可能损害训练速度和知识迁移；隔离相关梯度，并为主干保留合适的监督，能够缓解这类问题。<sup><a href="#ref-7">[7]</a></sup>

这些工作支持在具体系统中比较联合训练与梯度隔离方案。相关收益可能来自共享表示、监督内容和优化方式的共同作用；它们各自的贡献，还需要专门的消融实验区分。

动作表示的收益同样依赖训练条件。丰田研究院比较的离散动作 token 方案没有带来统计显著的增益，部分方案还降低了泛化表现。<sup><a href="#ref-31">[31]</a></sup> 这限定了相关方案在该实验中的效果，不能据此否定动作分块、分布建模或其他表示在不同任务中的作用。

### 环境与任务多样性

Lin、Hu 等人的研究中，部分设置在约五十条演示后出现收益饱和，增加环境与物体则继续改善泛化。<sup><a href="#ref-30">[30]</a></sup> 五十条是实验观察到的数量级，不适合作为所有任务的采集上限。

AgiBot 的研究也发现任务多样性的价值，并讨论了不同操作员习惯给训练带来的干扰，针对速度差异的去偏处理有所帮助。<sup><a href="#ref-32">[32]</a></sup> MimicLabs 则分析了摄像头位姿和空间布局等变化的作用。<sup><a href="#ref-33">[33]</a></sup>

这些结果说明，新增数据的价值取决于它补充了什么条件。同一环境的额外演示仍可能提高精度、覆盖罕见失败或帮助估计动作分布；已经充分覆盖的常见轨迹继续重复，收益通常较小。采集预算需要根据失败分布调整。

### 人类视频的跨本体迁移

Dyna-2 在 1,000、10,000、100,000 和 1,000,000 小时的人类视频子集上训练，保持数据来源比例、验证集和训练设置一致。人类留出集与未参与预训练的机器人数据上，离线动作指标都随预训练数据增长而改善。<sup><a href="#ref-1">[1]</a></sup>

![Dyna-2 的人类与机器人动作误差曲线，以及不同研究报告的幂律指数示意](/images/blog/action-bottleneck/fig-scaling.svg)

*左图比较 Dyna-2 的同本体评测与跨本体评测，右图汇总不同研究的拟合指数。<sup><a href="#ref-1">[1]</a>，<a href="#ref-8">[8]</a>，<a href="#ref-34">[34]</a></sup> 各研究使用的损失、单位、任务和拟合范围不同，曲线只能展示各自的变化趋势，不能按斜率直接排列模型的泛化能力。*

Dyna-2 报告的人类动作与机器人动作误差仍有差距，跨数据规模约为两到三倍。这里比较的是离线动作预测，指标口径与实际任务成功率不同。

迁移需要完成具体的动作映射。Dyna 从视频中提取手腕位姿，用作末端轨迹监督；从拇指和食指的距离构造连续抓握信号。<sup><a href="#ref-1">[1]</a></sup> 这些标签提供了与机器人动作相近的表示，但仍未完整记录机器人自身的动力学、接触力和执行误差。手部动作映射到双指夹爪与灵巧手，也需要不同的处理。

本文对公开规模点作过带渐近项的重拟合，得到的外推范围很宽。<sup><a href="#ref-35">[35]</a></sup> 数据只覆盖四档规模，拟合结果对函数形式与渐近项敏感。现有曲线支持继续检验人类数据的迁移收益，尚不足以预测再采集多少小时就能消除身体差异，更无法据此估算达到人类水平的时间。

### 微调与上下文学习

在 Dyna-2 的真机规模实验中，研究者对不同预训练规模的模型，使用相同的十四项任务数据进行后训练，每项任务最多十小时。保持这些数据不变，扩大人类视频预训练仍带来了真机收益：锁箱转钥匙任务在十万小时预训练时为 0/10，百万小时为 9/10。<sup><a href="#ref-1">[1]</a></sup>

这项对照同时显示了预训练与任务适配的作用。更广泛的人类经验帮助模型利用少量机器人数据，而机器人数据补充了该身体执行任务的方式。结果并不能证明每个新任务永久需要单独采集，也不能证明任务数据完全没有迁移能力。

适配所需的信息量已经在变化。Generalist 的 GEN-1.5 报告，在上下文中加入一段 3 至 12 秒的感知与动作演示，不做梯度更新，十个任务的平均成功率为 59%，报告的标准差为 10%；使用每任务五分钟数据进行十步梯度更新后，平均成功率为 83%，标准差为 9%。这些“±”数值表示标准差，不能读成 95% 置信区间。<sup><a href="#ref-36">[36]</a></sup>

该演示可以由手持夹爪采集，也可以来自机器人执行记录，包含传感器数据和动作轨迹。研究者限定这些实验为简单、短时任务，并说明上下文适配得到的技能仍比微调模型脆弱。<sup><a href="#ref-36">[36]</a></sup> 因而，这项结果支持用短演示完成部分任务适配，不能概括为任意视频都能教会机器人一项技能。

任务经验还可以在部署中继续积累。Physical Intelligence 的 RECAP 使用策略执行结果、纠正和奖励改进模型。<sup><a href="#ref-5">[5]</a></sup> 这让数据采集覆盖策略自己遇到的状态。它能否减少后续人工示教，要结合接管次数、失败恢复和采集成本评估。

## 开环评测与闭环执行

前面的实验大量使用动作预测误差。这个指标适合比较训练过程，却无法单独回答机器人能否完成任务，因为预测时看到的状态与执行时遇到的状态可能不同。

开环评测把模型放在记录好的轨迹上，逐步比较预测与演示动作。模型的错误不会改变下一步输入。闭环评测让模型实际控制机器人或仿真环境，它的每次动作都会影响之后看到的状态。

![开环评测与闭环评测：前者读取固定记录，后者让策略动作持续影响环境与后续输入](/images/blog/action-bottleneck/fig-loop.svg)

*开环误差在演示者访问的状态上计算；闭环结果取决于学习策略实际访问的状态。动作偏差能否纠正，需要通过后续执行观察。*

用符号表示，开环损失通常对专家状态分布 <em>d<sub>expert</sub></em> 取平均；部署表现取决于策略 <em>π̂</em> 产生的状态分布 <em>d<sub>π̂</sub></em>。策略可能在专家轨迹附近预测准确，却不擅长从自身偏离后的状态恢复。

历史输入还可能提供与任务无关的预测线索。动作具有时间相关性，复制上一动作在离线记录上可能得分不错。Copycat 研究分析了模型依赖历史动作线索、弱化当前观测的现象；因果混淆研究则讨论了模仿学习中相关性与实际控制原因的错配。<sup><a href="#ref-37">[37]</a>，<a href="#ref-38">[38]</a></sup>

LIBERO-PRO 在标准基准之外扰动物体、初始状态、指令和环境，发现原先高分的模型在一些泛化设置中降到 0%。模型在目标物体被替换、指令被破坏后，仍可能执行类似动作。<sup><a href="#ref-39">[39]</a></sup> 另一项研究分析了多来源机器人数据中的捷径学习，模型可能利用背景和身体线索识别数据来源。<sup><a href="#ref-40">[40]</a></sup> 这些结果支持检查模型是否跟随任务条件，具体失效位置仍需要消融定位。

文中的绕障仿真也做了开环与闭环对照。两个网络都用一百条演示训练，其中一个额外接收上一条原始指令；指令噪声设为具有时间相关性的低频漂移。额外历史输入把开环 NMSE 从 0.414 降到 0.287，约改善 31%。各做二百次闭环测试，成功率分别为 70% 和 73%。<sup><a href="#ref-21">[21]</a></sup>

在这个样本量下，三个百分点的差异不足以确认稳定收益。它也不能证明收益恰好为零，或把全部开环改善都归因于噪声预测。可以确定的是，31% 的开环误差下降没有对应到同等幅度的任务成功率提升。

自动驾驶研究也报告过指标差异。一项三万小时数据的模仿学习研究观察到开环性能随数据呈幂律改善，但同样的关系未出现在闭环仿真中。<sup><a href="#ref-34">[34]</a></sup> Waymo 另一项基于五十万小时数据的研究则报告，闭环指标也随规模增长而改善。<sup><a href="#ref-41">[41]</a></sup> 数据、模型和评测协议不同，两项研究不能直接合并成统一结论；它们共同要求研究者验证代理指标与实际控制表现的关系。

### 误差累积与失败恢复

模仿学习的经典分析考虑了错误累积。若策略在专家状态上的单步错误率为 <em>δ</em>，一个长度为 <em>T</em> 的任务，其最坏情形累计代价差可以具有以下上界：

<p style="text-align:center;"><em>C(π̂) − C(π<sub>expert</sub>) ≤ O(δ · T²)</em></p>

这里假设单步代价有界，并采用相应的分类式错误定义。早期一次错误可能使策略进入训练中罕见的状态，影响余下许多步；任务越长，这种影响累积的机会越多。<sup><a href="#ref-42">[42]</a></sup>

这个界刻画的是特定假设下的最坏情况。关于模仿学习样本复杂度的研究进一步讨论了状态转移是否已知、策略类别和专家条件的作用。<sup><a href="#ref-43">[43]</a></sup> Foster 等人的分析则表明，在可实现性、累计回报范围和策略学习复杂度等条件得到控制时，使用对数损失的行为克隆可以得到更好的时长依赖。<sup><a href="#ref-44">[44]</a></sup> 连续控制任务不能直接套用二次增长作为实测规律。

部署中的恢复数据因此有单独价值。只记录成功演示，可能漏掉夹爪滑动、拿偏或位置偏离之后如何继续。把这些状态、纠正动作和任务结果补进训练，才能检验策略是否学会恢复。<sup><a href="#ref-5">[5]</a></sup>

### 成功率与测试样本量

闭环评测需要摆放物体、运行策略、检查结果，再把环境复位。仿真能够降低一部分成本；真实物体的损坏、状态变化和人工判断仍会影响真机测试速度。

如果把每次试验近似看成独立、同分布的成功或失败，用正态近似估计成功率所需的试验数：

<p style="text-align:center;"><em>N ≈ p(1 − p) · (1.96 / w)²</em></p>

<em>p</em> 是预期成功率，<em>w</em> 是 95% 置信区间的目标半宽。取 <em>p = 0.9</em>、<em>w = 0.02</em>，近似需要 864 次试验。NVIDIA 的评测文章给出一个精确二项区间的例子：1,030 次试验、观测成功率 90% 时，Clopper–Pearson 区间约为 88.0% 至 91.8%。<sup><a href="#ref-45">[45]</a></sup>

这里的区间只描述所测试条件下的抽样不确定性。换一个家庭、物体或任务，不能继续沿用同一个成功率和区间。

样本量较小时，模型排名也容易不稳定。文中的模拟把两个策略的真实成功率设为 80% 和 75%，重复比较四万次。每个策略只测十次时，把较差策略排在前面或判成平手的概率约为一半；各测二十次时约为 42%，各测一百次时仍约为 22%。<sup><a href="#ref-21">[21]</a></sup> 这里把平手计入“未能区分”，与单纯判错的概率有所区别。

![不同试验次数下，未能把真实成功率80%的策略排在75%策略之前的概率](/images/blog/action-bottleneck/fig-trials.svg)

*作者的二项试验模拟。纵轴把错误排名与平手合计，说明小样本可能无法稳定区分五个百分点的真实差异。<sup><a href="#ref-21">[21]</a></sup>*

PhAIL 对真实机器人 VLA 评测实践的调查提到，许多评测每个条件的执行次数不超过二十五，且缺少置信区间。<sup><a href="#ref-46">[46]</a></sup> 因而，比较相近模型时，需要同时报告试验数、区间、任务差异与失败类型。

仿真与自动化能减少这项负担。SIMPLER 在其测试范围内得到较高的仿真与真机策略排名相关性，但明确限定于现有模拟器能合理近似的大体刚性物体任务。<sup><a href="#ref-47">[47]</a></sup> AutoEval 探索自动化的真实机器人评测。<sup><a href="#ref-48">[48]</a></sup> 对布料、柔软物体和复杂接触，仍需要单独验证仿真是否足以比较策略。

## 长期运行的可靠性

从演示到部署，动作学习受到几种不同限制。输入缺少决定动作的信息，限制了逐步预测的准确度；样本覆盖不足与训练方式不当，可能引起过拟合或捷径学习；离线指标与闭环任务不一致，又增加了判断进展的难度。它们会同时出现，也需要分别验证。

改进可以从现有数据和失败记录开始。检查语言、触觉和历史是否记录了任务所需的条件；比较不同动作表示在闭环中的表现；按物体、布局、操作员和失败状态安排采集；在联合训练中同时评估动作能力与预训练知识的保留。每项选择都应有自己的对照。

预训练已经在一些研究中减少了任务适配所需的数据。下一步能否把这种收益扩展到更长、更精细的操作，要看短演示的适用范围、持续运行中的恢复能力，以及部署数据能否以可承担的成本帮助后续学习。训练曲线的改善需要与这些指标一起报告。

回到 Dyna 的现场对照，46% 与 87% 的通过率说明，内部接近满分之后仍有很大的泛化差异。对家用机器人，还需要知道这种表现能保持多久，每小时需要几次人工接管，换一组家庭环境后是否仍然成立。Dyna、Generalist 等公司的数字来自各自报告，公开方法有助于审查，但跨团队复现和长期使用记录仍然有限。家务机器人是否可靠，最终要在这些日常运行条件下判断。

<details>
<summary><strong>参考文献</strong>（点击展开）</summary>
<ol>
<li id="ref-1">Dyna Robotics，“Dyna-2: A 1-Million-Hour Scaling Law for World-Action Models”，2026 年 8 月。<a href="https://www.dyna.co/dyna-2">dyna.co/dyna-2</a>。训练目标消融使用带手部姿态标注的人类视频；零样本离线评测与任务后训练后的真机评测为不同实验。</li>
<li id="ref-2">Brohan 等（Google DeepMind），"RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control"，2023（55B 参数，PaLI-X 主干）。<a href="https://arxiv.org/abs/2307.15818">arXiv:2307.15818</a></li>
<li id="ref-3">Kim 等，"OpenVLA: An Open-Source Vision-Language-Action Model"，2024（7B 参数；评测中超过 55B 的 RT-2-X）。<a href="https://arxiv.org/abs/2406.09246">arXiv:2406.09246</a></li>
<li id="ref-4">Black 等（Physical Intelligence），"π0: A Vision-Language-Action Flow Model for General Robot Control"，2024（约 3B 参数）。<a href="https://arxiv.org/abs/2410.24164">arXiv:2410.24164</a></li>
<li id="ref-5">Physical Intelligence，"π*0.6: a VLA That Learns From Experience"（RECAP），2025。<a href="https://arxiv.org/abs/2511.14759">arXiv:2511.14759</a> · <a href="https://www.pi.website/blog/pistar06">pi.website/blog/pistar06</a></li>
<li id="ref-6">Li, Zhang 等，"VLA Models Are More Generalizable Than You Think: Revisiting Physical and Spatial Modeling"，2025（视角转移的失败定位到视觉 token，可用一个小适配器修复，而策略保持冻结）。<a href="https://arxiv.org/abs/2512.02902">arXiv:2512.02902</a></li>
<li id="ref-7">Driess 等（Physical Intelligence），“Knowledge Insulating Vision-Language-Action Models: Train Fast, Run Fast, Generalize Better”，2025。<a href="https://arxiv.org/abs/2505.23705">arXiv:2505.23705</a>。分析连续动作模块对主干训练和知识迁移的影响。</li>
<li id="ref-8">Kaplan 等，"Scaling Laws for Neural Language Models"，2020。<a href="https://arxiv.org/abs/2001.08361">arXiv:2001.08361</a></li>
<li id="ref-9">Hoffmann 等，"Training Compute-Optimal Large Language Models"（Chinchilla），NeurIPS 2022。<a href="https://arxiv.org/abs/2203.15556">arXiv:2203.15556</a></li>
<li id="ref-10">Mandlekar 等，"Scaling Robot Supervision to Hundreds of Hours with RoboTurk: Robotic Manipulation Dataset through Human Reasoning and Dexterity"，IROS 2019（111+ 小时遥操作）。<a href="https://arxiv.org/abs/1911.04052">arXiv:1911.04052</a></li>
<li id="ref-11">Khazatsky 等，"DROID: A Large-Scale In-The-Wild Robot Manipulation Dataset"，RSS 2024（76k 轨迹，约 350 小时）。<a href="https://arxiv.org/abs/2403.12945">arXiv:2403.12945</a></li>
<li id="ref-12">Bu 等（AgiBot），"AgiBot World Colosseo: A Large-scale Manipulation Platform for Scalable and Intelligent Embodied Systems"，2025（1M+ 轨迹，约 2,976 小时）。<a href="https://arxiv.org/abs/2503.06669">arXiv:2503.06669</a></li>
<li id="ref-13">Yuan 等，"Qwen-RobotManip Technical Report: Alignment Unlocks Scale for Robotic Manipulation Foundation Models"，2026（九个主要开源机器人数据集共约 11,000 小时）。<a href="https://arxiv.org/abs/2606.17846">arXiv:2606.17846</a></li>
<li id="ref-14">Grauman 等，"Ego4D: Around the World in 3,000 Hours of Egocentric Video"，CVPR 2022（3,670 小时）。<a href="https://arxiv.org/abs/2110.07058">arXiv:2110.07058</a></li>
<li id="ref-15">Grauman 等，"Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives"，CVPR 2024（1,286 视频小时）。<a href="https://arxiv.org/abs/2311.18259">arXiv:2311.18259</a></li>
<li id="ref-16">Hoque 等（Apple），"EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video"，2025（829 小时，338k 回合）。<a href="https://arxiv.org/abs/2505.11709">arXiv:2505.11709</a></li>
<li id="ref-17">Generalist AI，"GEN-0"，2025 年 11 月（270K+ 小时操作数据，每周约增长 10K 小时）。<a href="https://generalistai.com/blog/gen-0">generalistai.com/blog/gen-0</a></li>
<li id="ref-18">Generalist AI，"GEN-1"，2026（"预训练数据集不含机器人数据"；可穿戴设备语料）。<a href="https://generalistai.com/blog/gen-1">generalistai.com/blog/gen-1</a></li>
<li id="ref-19">小米机器人团队，"Xiaomi-Robotics-1: Scaling Vision-Language-Action Models with over 100K Hours of Real-World Trajectories"，2026。<a href="https://arxiv.org/abs/2607.15330">arXiv:2607.15330</a></li>
<li id="ref-20">NVIDIA，"GR00T N1: An Open Foundation Model for Generalist Humanoid Robots"，2025（2.2B 参数）。<a href="https://arxiv.org/abs/2503.14734">arXiv:2503.14734</a></li>
<li id="ref-21">作者的二维绕障与统计仿真，2026。包括隐藏变量消融、局部条件方差估计、训练曲线、回合与帧数对照、观测目标分解、开环与闭环对照、评测抽样和粘滑模拟。正文给出单步更新示例，完整实验脚本尚未随文公开；具体数值限于相应仿真设置。</li>
<li id="ref-22">“FACT: Demystifying When and Why VLAs Fail in Contact-Rich Tasks and How to Fix Them”，2026。<a href="https://arxiv.org/abs/2608.01402">arXiv:2608.01402</a>。分析接触密集任务中的力控制与其他失效因素。</li>
<li id="ref-23">Niu 等，“T-Rex: Tactile-Reactive Dexterous Manipulation”，2026。<a href="https://arxiv.org/abs/2606.17055">arXiv:2606.17055</a>。报告约 100 小时触觉操作数据。</li>
<li id="ref-24">Bauza & Rodriguez，"A Probabilistic Data-Driven Model for Planar Pushing"，2017（真实硬件上重复相同的推，产出一个结果分布）。<a href="https://arxiv.org/abs/1704.03033">arXiv:1704.03033</a></li>
<li id="ref-25">Denton & Fergus，“Stochastic Video Generation with a Learned Prior”，ICML 2018。<a href="https://arxiv.org/abs/1802.07687">arXiv:1802.07687</a>。用随机潜变量建模视频中不确定的未来。</li>
<li id="ref-26">Bruce 等（Google DeepMind），"Genie: Generative Interactive Environments"，ICML 2024（一个在未标注互联网视频上训练的世界模型，从未见过动作标签却学出一个可控的潜动作空间）。<a href="https://arxiv.org/abs/2402.15391">arXiv:2402.15391</a></li>
<li id="ref-27">Zhang 等，"Understanding Deep Learning Requires Rethinking Generalization"，ICLR 2017。<a href="https://arxiv.org/abs/1611.03530">arXiv:1611.03530</a></li>
<li id="ref-28">Arpit 等，“A Closer Look at Memorization in Deep Networks”，ICML 2017。<a href="https://arxiv.org/abs/1706.05394">arXiv:1706.05394</a>。研究深度网络学习规律与记忆训练样本的过程。</li>
<li id="ref-29">Chi 等，"Diffusion Policy: Visuomotor Policy Learning via Action Diffusion"，RSS 2023。<a href="https://arxiv.org/abs/2303.04137">arXiv:2303.04137</a></li>
<li id="ref-30">Lin、Hu 等，“Data Scaling Laws in Imitation Learning for Robotic Manipulation”，ICLR 2025。<a href="https://arxiv.org/abs/2410.18647">arXiv:2410.18647</a>。研究环境、物体及演示数量对泛化的影响，包含四万多条演示与一万五千多次真机执行测试。</li>
<li id="ref-31">丰田研究院等，“A Systematic Study of Data Modalities and Strategies for Co-training Large Behavior Models for Robot Manipulation”，2026。<a href="https://arxiv.org/abs/2602.01067">arXiv:2602.01067</a>。比较 89 个策略，包含 58,000 次仿真与 2,835 次真实机器人执行测试。</li>
<li id="ref-32">Shi, Chen 等（AgiBot），"Is Diversity All You Need for Scalable Robotic Manipulation?"，2025（任务多样性胜过单任务数量；操作员多样性去偏有帮助）。<a href="https://arxiv.org/abs/2507.06219">arXiv:2507.06219</a></li>
<li id="ref-33">Saxena, Bronars 等，"What Matters in Learning from Large-Scale Datasets for Robot Manipulation"（MimicLabs），ICLR 2025。<a href="https://arxiv.org/abs/2506.13536">arXiv:2506.13536</a></li>
<li id="ref-34">Zheng 等，"Data Scaling Laws for Imitation Learning-Based End-to-End Autonomous Driving"，2024（开环幂律，r = −0.963，未能迁移到闭环）。<a href="https://arxiv.org/abs/2412.02689">arXiv:2412.02689</a></li>
<li id="ref-35">作者基于 Dyna-2 公开规模点所作的带渐近项曲线拟合与自助法计算，2026。外推对拟合形式和渐近项敏感，完整计算脚本尚未随文公开，不作为规模门槛或到达时间的预测。</li>
<li id="ref-36">Generalist AI，“GEN-1.5: Embodied Foundation Models are One-Shot Learners”，2026 年 8 月。<a href="https://generalistai.com/blog/gen-1.5">generalistai.com/blog/gen-1.5</a>。短演示上下文适配平均成功率为 59%，每任务五分钟数据微调后为 83%；报告中的 ±10% 与 ±9% 均为标准差。</li>
<li id="ref-37">Wen 等，"Fighting Copycat Agents in Behavioral Cloning from Observation Histories"，NeurIPS 2020。<a href="https://arxiv.org/abs/2010.14876">arXiv:2010.14876</a></li>
<li id="ref-38">de Haan, Jayaraman & Levine，"Causal Confusion in Imitation Learning"，NeurIPS 2019。<a href="https://arxiv.org/abs/1905.11979">arXiv:1905.11979</a></li>
<li id="ref-39">Zhou 等，“LIBERO-PRO: Towards Robust and Fair Evaluation of Vision-Language-Action Models Beyond Memorization”，2025。<a href="https://arxiv.org/abs/2510.03827">arXiv:2510.03827</a>。评估物体、初始状态、任务指令和环境扰动下的模型表现。</li>
<li id="ref-40">Xing 等，"Shortcut Learning in Generalist Robot Policies: The Role of Dataset Diversity and Fragmentation"，CoRL 2025。<a href="https://arxiv.org/abs/2508.06426">arXiv:2508.06426</a></li>
<li id="ref-41">Baniodeh 等（Waymo），“Scaling Laws of Motion Forecasting and Planning”，2025。<a href="https://arxiv.org/abs/2506.08228">arXiv:2506.08228</a>。使用五十万小时驾驶数据，报告其设置下闭环指标随规模改善。</li>
<li id="ref-42">Ross & Bagnell，“Efficient Reductions for Imitation Learning”，AISTATS 2010。<a href="https://proceedings.mlr.press/v9/ross10a.html">PMLR 9:661–668</a>。分析行为克隆中的错误累积；后续 DAgger 工作见 Ross、Gordon & Bagnell，2011，<a href="https://arxiv.org/abs/1011.0686">arXiv:1011.0686</a>。</li>
<li id="ref-43">Rajaraman 等，“Toward the Fundamental Limits of Imitation Learning”，NeurIPS 2020。<a href="https://arxiv.org/abs/2009.05990">arXiv:2009.05990</a>。分析不同策略和环境假设下模仿学习的样本复杂度。</li>
<li id="ref-44">Foster、Block & Misra，“Is Behavior Cloning All You Need? Understanding Horizon in Imitation Learning”，NeurIPS 2024。<a href="https://arxiv.org/abs/2407.15007">arXiv:2407.15007</a>。在可实现性、累计回报范围和策略类别复杂度等条件下，分析对数损失的时长依赖。</li>
<li id="ref-45">NVIDIA 技术博客，“How to Evaluate General-Purpose Robot Policies for Real-World Deployment”，2026。<a href="https://developer.nvidia.com/blog/how-to-evaluate-general-purpose-robot-policies-for-real-world-deployment/">developer.nvidia.com</a>。讨论评测指标、试验数量与 Clopper–Pearson 置信区间。</li>
<li id="ref-46">Sergey Arkhangelskiy，"PhAIL: A Real-Robot VLA Benchmark and Distributional Methodology"，2026（评测实践调查：真实机器人 VLA 评测"仍建立在固定超时下的二值成功率、每条件 N ≤ 25 次滚动、几乎总是不带置信区间"之上）。<a href="https://arxiv.org/abs/2605.29710">arXiv:2605.29710</a></li>
<li id="ref-47">Li 等，"Evaluating Real-World Robot Manipulation Policies in Simulation"（SIMPLER），CoRL 2024。<a href="https://arxiv.org/abs/2405.05941">arXiv:2405.05941</a> · <a href="https://simpler-env.github.io/">simpler-env.github.io</a></li>
<li id="ref-48">Zhou 等，"AutoEval: Autonomous Evaluation of Generalist Robot Manipulation Policies in the Real World"，2025。<a href="https://arxiv.org/abs/2503.24278">arXiv:2503.24278</a></li>
</ol>
</details>
