---
title: 'Why Robots Are Still Just Big Remote-Controlled Toys'
description: "Why robot models generalize poorly: the conditions missing from action prediction, accidental correlations in training, and the coverage of demonstration data, plus what human video and interaction data can add."
pubDate: 2026-08-16
tags: [embodied-ai, robotics, VLA, scaling, world-models]
locale: en
---

## The generalization problem in robotics

In August 2026, Dyna Robotics published a comparison between its lab and its customers' sites. On in-house evaluations, Dyna-1 and Dyna-2 both passed at close to 100%. At customer sites the models had never seen in training, graded against the customers' own requirements for quality, speed, and reliability, the pass rates were 46% and 87%. The two generations used the same task post-training data and the same number of training steps.<sup><a href="#ref-1">[1]</a></sup>

The result shows progress, and it also shows how hard generalization still is for robots. After learning a set of demonstrated motions in the training scene, a robot still struggles to adapt to a new site, new objects, and new operating conditions.

In everyday household chores, picking up a cup means choosing a grasp point, judging whether the cup will slip, and adjusting force after contact. Any of these can run into a situation the training data never covered. A model can "recognize the cup" and "understand" the instruction to pick it up and still fail while executing.

Language models and video generation models already generalize well across many tasks. Why is a model that predicts actions still so limited? That is the question this article works through. If you have run into the same puzzle in your own experiments, read on.

The next two sections cover background on the models and on scaling laws. If you already know VLA, WAM, and scaling laws, skip ahead to [Sources of error in action prediction](#sources-of-error-in-action-prediction).

## VLA and WAM

A vision-language-action model (VLA) takes camera frames, a language instruction, and the robot's own state as input and generates actions. Many VLAs inherit a large pretrained vision-language model and add an action output module on top. The action can be a change in end-effector pose, a set of joint targets, or a continuous trajectory segment, which a controller turns into execution commands.<sup><a href="#ref-2">[2]</a>,<a href="#ref-3">[3]</a>,<a href="#ref-4">[4]</a></sup>

A world-action model (WAM) also learns to predict future observations. In Dyna-2, video and actions use separate representations and network modules that interact through attention, and the model used for the scaling experiments is trained on video prediction and action prediction at the same time. The video objective shapes the shared representation, and at control time the model can generate actions directly.<sup><a href="#ref-1">[1]</a></sup>

These models mostly rely on imitation learning, and the common method within it is behavior cloning: record the observations and actions while a demonstrator performs the task, then train the model to predict the action from the frames, the task description, and the robot's own state. The data can come from a person teleoperating the robot, or from handheld grippers, wearable devices, or video of humans doing the task. The latter sources reduce the dependence on the robot body itself, and they bring their own problems with action labeling and cross-embodiment transfer.

Reinforcement learning improves a policy from the rewards received after acting, and it can use interaction data from simulation or from real robots. It can also be combined with behavior cloning: get an initial policy from demonstrations, then keep training on the policy's own execution records, corrections, and rewards.<sup><a href="#ref-5">[5]</a></sup>

Pretraining, imitation learning, and reinforcement learning each supply a different kind of experience. A vision-language model has seen a huge number of objects and concepts, demonstrations record how a person performs the task, and interaction data contains the feedback a robot gets after executing an action. To apply this experience to new objects and tasks, the model still has to learn the relationship between the current observation and the action.

## Scaling laws for robots

The scaling laws of language models are an attractive reference point. In 2020, Kaplan and colleagues found that, within the range they studied, a language model's test loss follows a fairly stable power law in model size, data volume, and compute.<sup><a href="#ref-8">[8]</a></sup> The later Chinchilla work went on to study how to balance parameter count against training data under a fixed compute budget.<sup><a href="#ref-9">[9]</a></sup>

Written in shorthand, the relationship between data volume and loss is:

<p style="text-align:center;"><em>L(D) ≈ k · D<sup>−α</sup> + L<sub>∞</sub></em></p>

Here <em>D</em> is the amount of data, <em>α</em> describes how fast the improvable part of the loss falls as data grows, <em>k</em> sets its magnitude, and <em>L<sub>∞</sub></em> is the asymptotic loss term in the fit. Every doubling of the data multiplies <em>L(D) − L<sub>∞</sub></em> by <em>2<sup>−α</sup></em>. The part that is a straight line on log-log axes is this improvable loss; once a nonzero asymptotic term is included, the curve gradually flattens.

Robotics research is testing for similar relationships, but "data volume" here lumps together very different material. RoboTurk released 111 hours of teleoperation data, DROID about 350 hours, and AgiBot World about 2,976 hours. Qwen-RobotManip's tally of nine major open-source robot datasets comes to roughly 11,000 hours.<sup><a href="#ref-10">[10]</a>,<a href="#ref-11">[11]</a>,<a href="#ref-12">[12]</a>,<a href="#ref-13">[13]</a></sup> Dyna-2's pretraining corpus exceeds one million hours, mostly first-person video of humans doing manipulation.<sup><a href="#ref-1">[1]</a></sup>

![Published hours of robot action datasets and human manipulation data, plotted on a log scale by year of publication](/images/blog/action-bottleneck/fig-datacurve.svg)

*Data volume by collection method. Orange: recorded robot actions. Blue: data collected from humans.<sup><a href="#ref-10">[10]</a>,<a href="#ref-11">[11]</a>,<a href="#ref-12">[12]</a>,<a href="#ref-14">[14]</a>,<a href="#ref-15">[15]</a>,<a href="#ref-16">[16]</a>,<a href="#ref-17">[17]</a>,<a href="#ref-18">[18]</a>,<a href="#ref-19">[19]</a></sup> The sources, sensors, and labeling methods differ. The trend lines describe only these published samples, not an industry-wide growth rate. A million-hour commercial corpus and the total of the open-source datasets are also not a like-for-like comparison.*

An hour of human video and an hour of robot teleoperation provide different action supervision. The first usually requires extracting actions from wrist trajectories, finger distances, or device readings. The second records the commands and states of a specific robot performing the task. Hour counts reflect collection scale; judging training value also requires looking at label quality, task coverage, and the difference in bodies.

Model parameter counts have similar limits. GR00T N1 has 2.2B parameters, π0 about 3B, OpenVLA 7B, and RT-2 once used a 55B backbone.<sup><a href="#ref-20">[20]</a>,<a href="#ref-4">[4]</a>,<a href="#ref-3">[3]</a>,<a href="#ref-2">[2]</a></sup> OpenVLA outperformed the larger RT-2-X in its paper's evaluation, but the two differ in data and training recipe, so the comparison alone says nothing about the effect of parameter count. Robots are also constrained by control frequency and inference latency, so scaling up a model has to account for execution speed.<sup><a href="#ref-7">[7]</a></sup>

Dyna-2's ablations look at the training objective more directly. The researchers extracted pseudo-actions from human video with hand-pose annotations and, at 5,000, 50,000, and 100,000 hours, compared three recipes: predicting actions only, jointly predicting video and actions, and adding video without action labels on top of that. In zero-shot offline evaluation on 39 robot tasks, action-only training showed severe and unstable overfitting. Only after adding extra video-prediction data did cross-embodiment transfer improve steadily with data volume.<sup><a href="#ref-1">[1]</a></sup>

This result shows that, under this data, architecture, and evaluation setup, the training objective and the data mix affect the return on scale. To explain why, we need to look at the action labels themselves.

## Sources of error in action prediction

The training data records the actions the demonstrator took. It does not necessarily record why. A person who reaches for the right side of a cup handle might be avoiding an obstacle on the left or might simply be in the habit. Both cases can leave similar action labels, and the model has to tell them apart from the information in its input.

Below, <em>x<sub>t</sub></em> stands for the observation history, task instruction, and robot state the model receives, <em>a<sub>t</sub></em> for the demonstrated action, and <em>o<sub>t+1</sub></em> for the next observation. The camera frame records only part of the physical state. The demonstrator's choice of detour, their habits, and the forces they felt on contact are not necessarily in these inputs either.

### Hidden state

Two people go around an obstacle from the same position. One goes left, the other right. Before the fork, their position histories can be identical. If the model receives only the instruction "go to target O", nothing in these inputs determines which side the demonstrator will pick.

Add the phrase "go around on the left" and the choice becomes definite. If the demonstrator picks a side at random each time and the recording contains no clue, collecting more demonstrations can help the model learn the left-right ratio, but it still cannot predict any one random pick. This separates two things: learning the distribution of possible actions, and guessing the specific action in one recording. When both paths complete the task, the robot only needs to commit to one of them and execute it.

When is video prediction easier? Suppose the model already knows the action about to be executed. Then it can predict how the scene changes from that action. Given a "move left" command, for example, the detour direction is settled, and the model can learn how position changes with motion. The two tasks condition on different things:

<p style="text-align:center;">Action-conditioned future prediction: <em>p(o<sub>t+1</sub> | x<sub>t</sub>, a<sub>t</sub>)</em><br />Action prediction: <em>p(a<sub>t</sub> | x<sub>t</sub>)</em></p>

The action condition supplies the choice already made; action prediction has to learn how to make the choice from the observation. Genie predicts the next frame from the video history and a latent action, where the latent action is learned from changes in the video and can be specified by the user at generation time.<sup><a href="#ref-26">[26]</a></sup> Designs like this remove part of the uncertainty in future prediction. Conditions such as friction and contact location may still be missing, so a given action does not guarantee a fully determined prediction.

The specific training setup of a WAM needs to be checked case by case, though. The Dyna-2 variant used for the scaling experiments shares a backbone and trains separate flow-matching objectives for video and actions. Both tasks condition on the same history, and the video branch does not directly receive the true future action.<sup><a href="#ref-1">[1]</a></sup> So this set of experiments cannot be attributed simply to the video branch getting an extra <em>a<sub>t</sub></em>. General video generation also often has to model several possible futures at once.<sup><a href="#ref-25">[25]</a></sup>

**When the input omits the conditions behind an action choice, the model can only learn the action distribution from the information that was recorded. With limited samples, it may tie an incidental detail of a scene to one action choice. Training loss keeps falling, and predictions get worse on a new batch of demonstrations.** This is one path that can lead to overfitting. Confirming it requires checking missing information, sample coverage, and training behavior separately. Two loss curves, one for actions and one for video, are not enough to identify the cause.

We built a simple 2D obstacle-avoidance simulation to see how a hidden choice affects prediction. Each demonstration picks a detour side at random, with a style difference in how early it turns and jitter on the command. Both models receive the last two positions. The observation head predicts the next position; it corresponds to the vision head in the figures. The action head predicts the raw action command. The observation head here is just a position regression model, unlike a VLA's vision encoder or a WAM's video branch.<sup><a href="#ref-21">[21]</a></sup>

The simulation also has inertia: execution velocity depends on the previous velocity and the current command together, so brief command jitter gets smoothed. Predicting the raw command and predicting the position after motion are therefore disturbed in different ways, and the errors of the two targets have to be interpreted separately.

![2D obstacle simulation: demonstration trajectories fork on either side of the obstacle, and the raw commands pass through an inertia filter into smoother position changes](/images/blog/action-bottleneck/fig-setup.svg)

*Left: detour side and turning style. Right: raw command versus executed motion. Neither prediction head receives the current action, the detour side, or the style parameter. This experiment does not test the effect of adding an action condition to video prediction.*

<details>
<summary>Simulation setup and hidden-variable ablation</summary>

```python
# Hidden per episode: side (detour side), turn_dist (turning distance).
if x < OBS_X and (OBS_X - x) < turn_dist and abs(y) < 1.0:
    target = (x + 0.5, side * 1.2)
else:
    target = GOAL
d = unit_vector(target - pos)
cmd = SPEED * d + gauss(0, 0.05)
exec_v = 0.6 * exec_v + 0.4 * cmd
pos = pos + exec_v

# Both predictions use the last two positions:
# observation head: pos_next
# action head: cmd
# Nearest neighbor: 200 training episodes, 200 validation episodes.
# Small MLP: 4 -> 240 tanh -> 2; also compared at 8 and 200 episodes.
```

The simulation measures the prediction error of positions or commands with normalized mean squared error (NMSE):

<p style="text-align:center;"><em>NMSE = E‖ŷ − y‖² / Var(y)</em></p>

For a vector target, <em>Var</em> is the sum of the per-dimension variances. This metric is used only for the simple regression experiments below; its optimization behavior does not transfer directly to diffusion or flow-matching policies.

A nearest-neighbor model fit to each target reaches zero error on the 200 training episodes. On 200 new episodes, action NMSE is 0.631 and observation NMSE is 0.0033. That is a factor of about 190, but the two use different normalizing denominators, so the ratio cannot be read directly as a gap in generalization ability.

Removing the hidden variables one at a time gives a further comparison:

| Simulation condition | Action NMSE | Observation NMSE |
|---|---:|---:|
| Detour side, style, and jitter hidden | 0.62 | 0.003 |
| Command jitter only | 0.36 | 0.002 |
| Hidden decision only | 0.28 | 0.001 |
| All hidden factors kept, predict executed velocity instead | 0.22 | 0.003 |

*These results come from the author's simulation.<sup><a href="#ref-21">[21]</a></sup> The 0.62 and the 0.631 above are from different runs. The table reports prediction error, which is not directly a lower bound on irreducible error; changing the target also changes the normalizing denominator.*

With command noise turned off, the hidden detour decision still causes prediction error. Switching to predicting the executed velocity changes both the error and the denominator, because the target has been smoothed by inertia. The position and inertial motion in the observation target can be predicted from history, which keeps the overall error low. These numbers do not constitute evidence that vision generalizes better than action.

The simulation has no image encoding, complex contact, or real robot control. The code above shows only the single-step update; the full training, sampling, and statistics scripts are not yet published with this article.<sup><a href="#ref-21">[21]</a></sup>

</details>

### Missing state during contact

The obstacle example above assumed both sides were passable. If one side has a blockage the camera cannot see, the detour choice also affects whether the task succeeds. This kind of missing information shows up in many tasks, and contact manipulation is one example.

Two cups that look alike can differ in weight and surface friction, so the grip force they need may differ too. A demonstrator feels the cup start to slip. A model that receives only the image from the same viewpoint has no basis for that extra squeeze. FACT's analysis of contact-rich tasks separates force-control failures from other problems with vision and positioning precision.<sup><a href="#ref-22">[22]</a></sup>

Tactile and force feedback can supplement these observations, but the amount collected is still small. T-Rex reports about 100 hours of tactile manipulation data, a long way from million-hour video corpora.<sup><a href="#ref-23">[23]</a></sup> How much a task depends on touch varies. Deformation visible in the image, motion history, and active probing can also supply some of the physical information.

Contact also amplifies small unobserved differences. In our stick-slip simulation, with the friction parameter varied by ±1%, the spread of displacement outcomes near the static-friction threshold was about 83 times that of a smoothly damped control; away from the threshold the difference shrank sharply.<sup><a href="#ref-21">[21]</a></sup> The factor of 83 is a result of this simulation and cannot be converted into a uniform amplification rate for real robot error. Hardware studies of planar pushing have also measured a distribution of outcomes from repeated, nearly identical pushes.<sup><a href="#ref-24">[24]</a></sup>

Friction and contact location affect the frame after the action too. Without this information, video prediction also runs into trouble. When comparing how actions and video generalize, first check which state each input contains and which of the conditions that determine the outcome are still missing.

### Accidental correlations and overfitting

How does a model use a demonstration with incomplete information? Suppose that in the training set, by chance, every demonstration on a blue table goes left and every one on a white table goes right, while the task allows either side. Table color then helps the model lower its training error. Change the table or change the demonstrator, and that correlation can break. With richer inputs, the network can also identify a particular training trajectory from tiny position differences and remember its actions and jitter.

This is what "memorizing noise" means here. One instance of jitter becomes part of the training label, and the model uses incidental features of the sample to fit it. Those features have no stable relationship to the next instance of jitter. If the model keeps strengthening this kind of mapping, training loss can fall while validation loss rises. Random-label experiments show that deep networks are capable of memorizing mappings with no real regularity, and studies of the memorization process have observed the difference between learning patterns and memorizing samples.<sup><a href="#ref-27">[27]</a>,<a href="#ref-28">[28]</a></sup> They support the possibility of this mechanism; whether a specific robot model does this still needs ablation.

Diffusion Policy, π0, and action-token models can all represent several possible actions.<sup><a href="#ref-29">[29]</a>,<a href="#ref-4">[4]</a>,<a href="#ref-2">[2]</a></sup> For a task where either side is passable, the model can learn both options and sample one to execute. For a task where grip force has to adjust to weight, no matter how rich the action distribution, the model cannot conjure up the weight of this particular cup.

A distributional model can also concentrate too much probability on the actions in the training samples. Whether a model can represent a multimodal distribution and whether it can learn that distribution accurately under new conditions are two different questions. The squared error in flow matching is used to learn the denoising velocity field, and its final output cannot be read as "averaging the left and right actions".<sup><a href="#ref-4">[4]</a></sup>

Incomplete information does not necessarily make validation loss rise, either. As long as the model learns the stable pattern or action distribution the input can support, validation performance may level off. Overfitting also depends on data coverage, model capacity, and the training process. The small regression experiment below shows only one of these paths.

Our small MLP was trained on only eight demonstrations for 4,000 epochs. Observation training and validation NMSE reached 0.0014 and 0.0019. Action validation error fell to about 0.53 at epoch 45 and then climbed back to about 0.60, while training error fell to about 0.31.<sup><a href="#ref-21">[21]</a></sup>

![Error curves from eight training episodes: action validation error falls, then rises; observation error stays low](/images/blog/action-bottleneck/fig-curves.svg)

*Action validation error first falls and then rises, showing the overfitting in this training run. The "floor" in the figure is a lower bound on regression error estimated from local conditional variance, and it applies only to this input, this target, and the NMSE metric. It does not constrain the task success rate of modern generative action models.*

<details>
<summary>Cross-comparison: extra information versus sample count</summary>

Hand the hidden detour side and style to the model, and the result depends on data volume. The nearest-neighbor model's action validation error drops from about 0.62 to 0.38. The eight-episode MLP overfits more severely instead: training error drops to 0.12 and validation error rises to 8.7. With too few samples, a fixed style parameter can become a clue that identifies a particular training episode.

Expanding the training data to 200 episodes, the MLP given the hidden variables reaches a validation error of 0.41, and the version without them 0.48.<sup><a href="#ref-21">[21]</a></sup> More episodes widen the coverage of styles and trajectories and reduce the payoff from memorizing episode-specific features. From these curves alone, we still cannot confirm which internal features each model used.

![Hidden-variable visibility versus number of training episodes: at eight episodes, providing the style variable worsens overfitting; at 200 episodes, prediction improves](/images/blog/action-bottleneck/fig-grid.svg)

*The four results vary both the input information and the sample coverage, showing how the two interact. The floor of about 0.19 in the figure is approximated from the nearest-neighbor results; pinning it down needs an independent conditional-variance estimate.*

</details>

## The coverage of demonstration data

If training contains only a few scenes and operating habits, the model has a hard time telling which cues remain valid in a new task. Adding demonstrations helps, and how much depends on how many different conditions the new data brings.

For example, a two-second translation can be recorded as dozens of frames. Adjacent frames and actions are very close together and mostly repeat the conditions of the same motion. Raising the sampling rate adds frames and helps capture fast changes, but it does not automatically add variety in detour choices, object weights, or contact modes. Both video frames and action labels have this kind of repetition in time.

In the obstacle simulation, with the training frame count fixed at about 170, spreading the data from eight episodes to sixteen lowers the action head's validation NMSE from 0.85 to 0.76, and going to thirty-two gives about 0.75. Keeping eight episodes and only halving the frames changes action validation NMSE from 0.85 to 0.88.<sup><a href="#ref-21">[21]</a></sup> In this comparison, adding different episodes was more effective than keeping more adjacent frames within the same episodes, because the different episodes contain new combinations of detour side and turning.

Real-robot research has gone further and compared coverage of environments and objects. Lin, Hu, and colleagues collected more than 40,000 demonstrations and ran more than 15,000 real-robot execution tests. In their tasks, adding environment and object variety helped more than repeating the same set of conditions, and in some experiments the returns fell off clearly after about fifty demonstrations per environment-object combination.<sup><a href="#ref-30">[30]</a></sup>

That study examines generalization across environments and objects. Adjacent frames within each new demonstration are still similar; what grows is the set of objects, backgrounds, and operating conditions the training set covers. Only by completing the same cup-grasping task at different positions, with different cups, on different tables, does the model get a chance to distinguish which action cues can be reused across scenes.

AgiBot's research also found value in task diversity and discussed the interference that different operators' habits introduce into training; debiasing for speed differences helped.<sup><a href="#ref-32">[32]</a></sup> MimicLabs analyzed the effect of variation in camera pose and spatial layout.<sup><a href="#ref-33">[33]</a></sup> All of these check one concrete thing: which conditions the new data changes, and whether those changes improve the corresponding generalization test.

Hour counts are therefore not enough on their own to measure the training value of action data. Extra demonstrations in the same scene can add fine corrections or rare contact events; changing the scene tests whether previously learned relationships still hold. The more thoroughly the existing conditions are already covered, the more clearly the next batch of data needs a stated gap to fill.

## Limits on transferring pretrained knowledge

Vision-language pretraining provides far broader knowledge than robot demonstrations do. A model already knows cups and cup handles. After action training, why can it still fail when the cup or the viewpoint changes? Answering this requires checking whether the knowledge is preserved during training and whether the learned representation can be used for a new embodiment and new operating conditions.

### Joint training and knowledge retention

When the action output goes wrong, the failure may sit earlier, in visual processing. One viewpoint-transfer study localized a specific failure to the visual tokens and improved performance with a small adapter while keeping the policy frozen.<sup><a href="#ref-6">[6]</a></sup> This offers a control: examine the input representation and the action module separately, so that an action failure is not automatically blamed on the action head.

Dyna-2's results support video prediction helping cross-embodiment transfer.<sup><a href="#ref-1">[1]</a></sup> A study from Toyota Research Institute compared 89 policies across 58,000 simulated and 2,835 real-robot execution tests. Effective combinations of vision-language data, trajectory-language annotations, and cross-embodiment robot data improved performance under distribution shift, on unseen tasks, and on instruction following, while training on robot data alone eroded the backbone's vision-language ability.<sup><a href="#ref-31">[31]</a></sup>

Physical Intelligence's Knowledge Insulation work looks at interference between the action expert and the pretrained backbone. Attaching an untrained continuous action module directly can hurt training speed and knowledge transfer; isolating the relevant gradients and keeping suitable supervision on the backbone mitigates the problem.<sup><a href="#ref-7">[7]</a></sup>

These experiments locate the difficulty of transfer in another place besides the input: once pretrained knowledge enters action learning, it is also subject to the training objective and the gradient updates. Even when the raw input contains usable cues, the representation after training may not have kept them or used them well.

Gains from the action representation likewise depend on training conditions. The discrete action-token schemes compared by Toyota Research Institute brought no statistically significant gain, and some reduced generalization.<sup><a href="#ref-31">[31]</a></sup> That limits what those schemes achieved in that experiment; it does not rule out action chunking, distribution modeling, or other representations in other tasks.

### Cross-embodiment transfer from human video

Dyna-2 was trained on subsets of 1,000, 10,000, 100,000, and 1,000,000 hours of human video, keeping the source mix, validation set, and training setup fixed. Offline action metrics on both the human held-out set and robot data excluded from pretraining improved as the pretraining data grew.<sup><a href="#ref-1">[1]</a></sup>

![Dyna-2's human and robot action error curves, with a sketch of the power-law exponents reported by different studies](/images/blog/action-bottleneck/fig-scaling.svg)

*Left: Dyna-2's same-embodiment evaluation against its cross-embodiment evaluation. Right: fitted exponents collected from different studies.<sup><a href="#ref-1">[1]</a>,<a href="#ref-8">[8]</a>,<a href="#ref-34">[34]</a></sup> The studies use different losses, units, tasks, and fitting ranges, so the curves show only each one's trend; the slopes cannot be used to rank models by generalization ability.*

Dyna-2 reports a persistent gap between human-action and robot-action error, roughly a factor of two to three across data scales. Same-embodiment and cross-embodiment prediction still differ, then. The specific gap has to be read against the tasks and action representations of the two datasets and cannot be converted directly into task success rates.

Transfer requires a concrete action mapping. Dyna extracts wrist pose from video as end-effector trajectory supervision and constructs a continuous grasp signal from the distance between thumb and index finger.<sup><a href="#ref-1">[1]</a></sup> These labels provide a representation close to robot actions, but they still leave out the robot's own dynamics, contact forces, and execution error. Mapping hand motion onto a two-finger gripper and onto a dexterous hand also requires different handling.

We refit the published scale points with an asymptotic term, and the extrapolation range came out very wide.<sup><a href="#ref-35">[35]</a></sup> The data covers only four scales, and the fit is sensitive to the functional form and the asymptotic term. The existing curves support continuing to test the transfer benefit of human data. They are not enough to predict how many more hours would erase the embodiment difference, let alone to estimate a date for reaching human level.

### Adaptation information for a new task

Transfer from pretraining still has to be judged together with the extra information a model gets on the new task. A few demonstrations can fill in object placement, action ordering, or the handling of a specific embodiment, so direct transfer, in-context demonstration, and parameter fine-tuning need to be kept apart.

In Dyna-2's real-robot scaling experiment, models with different pretraining scales were post-trained on the same fourteen tasks, with at most ten hours per task. Holding that data fixed, more human-video pretraining still improved real-robot results: on the lockbox key-turning task, 0/10 at 100,000 hours of pretraining and 9/10 at a million.<sup><a href="#ref-1">[1]</a></sup>

In this comparison the amount of robot demonstration stays fixed, and broader human pretraining improves the later learning. The measured gain comes from the "human pretraining plus task post-training" setup. From this result alone, we do not know how the model would do with robot demonstrations removed entirely.

The amount of information adaptation needs is already changing. Generalist's GEN-1.5 reports that adding a 3-to-12-second perception-and-action demonstration to the context, with no gradient updates, gives an average success rate of 59% across ten tasks with a reported standard deviation of 10%. After ten gradient steps on five minutes of data per task, the average is 83% with a standard deviation of 9%. These "±" figures are standard deviations and should not be read as 95% confidence intervals.<sup><a href="#ref-36">[36]</a></sup>

The demonstration can be collected with a handheld gripper or taken from the robot's own execution record, and it includes sensor data and action trajectories. The researchers restrict these experiments to simple, short-horizon tasks and note that skills learned in context remain more brittle than fine-tuned models.<sup><a href="#ref-36">[36]</a></sup> So the result supports using a short demonstration for part of task adaptation. It does not generalize to "any video can teach a robot a skill".

Task experience can also keep accumulating during deployment. Physical Intelligence's RECAP improves the model with policy execution results, corrections, and rewards.<sup><a href="#ref-5">[5]</a></sup> This lets data collection cover the states the policy itself encounters. Whether it reduces later human demonstration has to be judged against intervention counts, failure recovery, and collection cost.

## Execution drift and state distribution

Another kind of generalization difficulty arises during execution. The robot's first grasp is slightly off, the cup slides to a new position, and the next step has to approach again from there. If training contains only demonstrations where the cup was picked up cleanly, the model may never have learned this kind of correction. Even with the same objects and the same site, the robot's own errors carry it into states the training data barely covers.

Open-loop evaluation places the model on a recorded trajectory and compares the predicted action with the demonstrated one step by step. At each step it receives the state the demonstrator left behind; if the model just predicted wrong, the next step still returns to the recorded input. Closed-loop execution carries forward the consequences of the model's own actions, and the model has to handle the states after drifting away. Checking open-loop loss alone misses this part of the generalization requirement.

![Open-loop versus closed-loop evaluation: the first reads a fixed recording, the second lets the policy's actions keep affecting the environment and subsequent inputs](/images/blog/action-bottleneck/fig-loop.svg)

*Open-loop error is computed on the states the demonstrator visited; closed-loop results depend on the states the learned policy actually visits. Whether an action deviation can be corrected is something only subsequent execution reveals.*

In symbols, open-loop loss is usually averaged over the expert's state distribution <em>d<sub>expert</sub></em>, while deployment performance depends on the state distribution <em>d<sub>π̂</sub></em> produced by the policy <em>π̂</em>. A policy can predict accurately near the expert trajectories and still be poor at recovering from states it drifted into.

History inputs can also supply prediction cues that have nothing to do with the task. Actions are correlated in time, so copying the previous action can score reasonably well on an offline recording. The copycat studies analyze models that rely on past-action cues and downweight the current observation; the causal-confusion work discusses the mismatch in imitation learning between correlations and the actual causes of control.<sup><a href="#ref-37">[37]</a>,<a href="#ref-38">[38]</a></sup>

LIBERO-PRO perturbs objects, initial states, instructions, and environments beyond the standard benchmark and finds that models with high scores there fall to 0% in some of the generalization settings. After the target object was swapped or the instruction corrupted, models could still perform similar actions.<sup><a href="#ref-39">[39]</a></sup> Another study analyzed shortcut learning in multi-source robot data, where a model may use background and embodiment cues to identify the data source.<sup><a href="#ref-40">[40]</a></sup> These results support checking whether a model follows the task conditions; locating the specific failure still requires ablation.

Our obstacle simulation also compared open loop against closed loop. Two networks were trained on a hundred demonstrations, one of which also received the previous raw command as input; the command noise was set to low-frequency drift with temporal correlation. The extra history input lowered open-loop NMSE from 0.414 to 0.287, an improvement of about 31%. In two hundred closed-loop tests each, the success rates were 70% and 73%.<sup><a href="#ref-21">[21]</a></sup>

At this sample size, a three-point difference is not enough to confirm a stable gain. It also does not prove the gain is exactly zero, or that all of the open-loop improvement came from noise prediction. What can be said is that a 31% drop in open-loop error did not correspond to a rise in task success of the same size.

Autonomous driving research has reported metric divergence too. An imitation-learning study on 30,000 hours of data observed open-loop performance improving with data as a power law, but the same relationship did not appear in closed-loop simulation.<sup><a href="#ref-34">[34]</a></sup> A separate Waymo study on 500,000 hours of data reports that closed-loop metrics also improve with scale.<sup><a href="#ref-41">[41]</a></sup> The data, models, and evaluation protocols differ, so the two cannot be merged into a single conclusion. Together they ask researchers to verify the relationship between proxy metrics and actual control performance.

### Error accumulation and failure recovery

The classic analysis of imitation learning considers error accumulation. If a policy's single-step error rate on expert states is <em>δ</em>, then for a task of length <em>T</em>, the worst-case gap in accumulated cost can have the following upper bound:

<p style="text-align:center;"><em>C(π̂) − C(π<sub>expert</sub>) ≤ O(δ · T²)</em></p>

This assumes bounded per-step cost and uses a corresponding classification-style definition of error. An early mistake can put the policy in a state that is rare in training and affect many of the remaining steps; the longer the task, the more chances this accumulation has.<sup><a href="#ref-42">[42]</a></sup>

The bound describes a worst case under specific assumptions. Work on the sample complexity of imitation learning goes further into the roles of whether the state transitions are known, the policy class, and conditions on the expert.<sup><a href="#ref-43">[43]</a></sup> The analysis by Foster and colleagues shows that when realizability, the range of cumulative return, and the complexity of policy learning are controlled, behavior cloning with log loss can get a better dependence on horizon.<sup><a href="#ref-44">[44]</a></sup> Continuous control tasks cannot simply take the quadratic growth as an empirical law.

Recovery data from deployment therefore has its own value. Recording only successful demonstrations can leave out how to continue after a gripper slips, a grasp lands off-center, or the position drifts. Only by adding these states, corrective actions, and task outcomes to training can we test whether the policy learns to recover.<sup><a href="#ref-5">[5]</a></sup>

<details>
<summary>Supplementary reading: sample sizes for closed-loop evaluation</summary>

This section discusses how to judge whether a difference across a handful of closed-loop tests is credible. It affects how generalization gains are measured, and it is separate from the action-learning mechanisms above.

Closed-loop evaluation requires placing objects, running the policy, checking the result, and resetting the environment. Simulation can lower part of the cost; damage to real objects, changes in state, and human judgment still slow down real-robot testing.

Treating each trial approximately as an independent, identically distributed success or failure, the normal approximation gives the number of trials needed to estimate a success rate:

<p style="text-align:center;"><em>N ≈ p(1 − p) · (1.96 / w)²</em></p>

<em>p</em> is the expected success rate and <em>w</em> is the target half-width of the 95% confidence interval. With <em>p = 0.9</em> and <em>w = 0.02</em>, the approximation needs 864 trials. NVIDIA's evaluation article gives an exact binomial-interval example: with 1,030 trials and an observed success rate of 90%, the Clopper-Pearson interval is about 88.0% to 91.8%.<sup><a href="#ref-45">[45]</a></sup>

The interval describes only the sampling uncertainty under the tested conditions. Change the home, the objects, or the task, and the same success rate and interval no longer carry over.

With small samples, model rankings are also unstable. Our simulation set two policies' true success rates at 80% and 75% and repeated the comparison 40,000 times. Testing each policy only ten times, the probability of ranking the worse policy first or calling a tie is about one half; at twenty each it is about 42%, and at a hundred each it is still about 22%.<sup><a href="#ref-21">[21]</a></sup> Ties are counted as "failed to distinguish" here, which differs from the probability of an outright wrong verdict.

![Probability of failing to rank a policy with a true 80% success rate above one at 75%, by number of trials](/images/blog/action-bottleneck/fig-trials.svg)

*The author's binomial trial simulation. The vertical axis combines wrong rankings and ties, showing that small samples may not reliably separate a true five-point difference.<sup><a href="#ref-21">[21]</a></sup>*

PhAIL's survey of real-robot VLA evaluation practice notes that many evaluations run no more than twenty-five trials per condition and lack confidence intervals.<sup><a href="#ref-46">[46]</a></sup> When comparing similar models, then, report the trial count, the interval, the task differences, and the failure types together.

Simulation and automation can lighten this burden. SIMPLER obtains a high correlation between simulated and real-robot policy rankings within its tested range, but explicitly limits itself to largely rigid-object tasks that existing simulators can reasonably approximate.<sup><a href="#ref-47">[47]</a></sup> AutoEval explores automated real-robot evaluation.<sup><a href="#ref-48">[48]</a></sup> For cloth, soft objects, and complex contact, whether simulation is good enough to compare policies still has to be verified separately.

</details>

<details>
<summary><strong>References</strong> (click to expand)</summary>
<ol>
<li id="ref-1">Dyna Robotics, "Dyna-2: A 1-Million-Hour Scaling Law for World-Action Models," August 2026. <a href="https://www.dyna.co/dyna-2">dyna.co/dyna-2</a>. The training-objective ablation uses human video with hand-pose annotations; the zero-shot offline evaluation and the real-robot evaluation after task post-training are separate experiments.</li>
<li id="ref-2">Brohan et al. (Google DeepMind), "RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control," 2023 (55B parameters, PaLI-X backbone). <a href="https://arxiv.org/abs/2307.15818">arXiv:2307.15818</a></li>
<li id="ref-3">Kim et al., "OpenVLA: An Open-Source Vision-Language-Action Model," 2024 (7B parameters; outperforms the 55B RT-2-X in its evaluation). <a href="https://arxiv.org/abs/2406.09246">arXiv:2406.09246</a></li>
<li id="ref-4">Black et al. (Physical Intelligence), "π0: A Vision-Language-Action Flow Model for General Robot Control," 2024 (about 3B parameters). <a href="https://arxiv.org/abs/2410.24164">arXiv:2410.24164</a></li>
<li id="ref-5">Physical Intelligence, "π*0.6: a VLA That Learns From Experience" (RECAP), 2025. <a href="https://arxiv.org/abs/2511.14759">arXiv:2511.14759</a> · <a href="https://www.pi.website/blog/pistar06">pi.website/blog/pistar06</a></li>
<li id="ref-6">Li, Zhang et al., "VLA Models Are More Generalizable Than You Think: Revisiting Physical and Spatial Modeling," 2025 (viewpoint-shift failures localize to the visual tokens and can be repaired with a small adapter while the policy stays frozen). <a href="https://arxiv.org/abs/2512.02902">arXiv:2512.02902</a></li>
<li id="ref-7">Driess et al. (Physical Intelligence), "Knowledge Insulating Vision-Language-Action Models: Train Fast, Run Fast, Generalize Better," 2025. <a href="https://arxiv.org/abs/2505.23705">arXiv:2505.23705</a>. Analyzes how a continuous action module affects backbone training and knowledge transfer.</li>
<li id="ref-8">Kaplan et al., "Scaling Laws for Neural Language Models," 2020. <a href="https://arxiv.org/abs/2001.08361">arXiv:2001.08361</a></li>
<li id="ref-9">Hoffmann et al., "Training Compute-Optimal Large Language Models" (Chinchilla), NeurIPS 2022. <a href="https://arxiv.org/abs/2203.15556">arXiv:2203.15556</a></li>
<li id="ref-10">Mandlekar et al., "Scaling Robot Supervision to Hundreds of Hours with RoboTurk: Robotic Manipulation Dataset through Human Reasoning and Dexterity," IROS 2019 (111+ hours of teleoperation). <a href="https://arxiv.org/abs/1911.04052">arXiv:1911.04052</a></li>
<li id="ref-11">Khazatsky et al., "DROID: A Large-Scale In-The-Wild Robot Manipulation Dataset," RSS 2024 (76k trajectories, about 350 hours). <a href="https://arxiv.org/abs/2403.12945">arXiv:2403.12945</a></li>
<li id="ref-12">Bu et al. (AgiBot), "AgiBot World Colosseo: A Large-scale Manipulation Platform for Scalable and Intelligent Embodied Systems," 2025 (1M+ trajectories, about 2,976 hours). <a href="https://arxiv.org/abs/2503.06669">arXiv:2503.06669</a></li>
<li id="ref-13">Yuan et al., "Qwen-RobotManip Technical Report: Alignment Unlocks Scale for Robotic Manipulation Foundation Models," 2026 (nine major open-source robot datasets total about 11,000 hours). <a href="https://arxiv.org/abs/2606.17846">arXiv:2606.17846</a></li>
<li id="ref-14">Grauman et al., "Ego4D: Around the World in 3,000 Hours of Egocentric Video," CVPR 2022 (3,670 hours). <a href="https://arxiv.org/abs/2110.07058">arXiv:2110.07058</a></li>
<li id="ref-15">Grauman et al., "Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives," CVPR 2024 (1,286 video hours). <a href="https://arxiv.org/abs/2311.18259">arXiv:2311.18259</a></li>
<li id="ref-16">Hoque et al. (Apple), "EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video," 2025 (829 hours, 338k episodes). <a href="https://arxiv.org/abs/2505.11709">arXiv:2505.11709</a></li>
<li id="ref-17">Generalist AI, "GEN-0," November 2025 (270K+ hours of manipulation data, growing by about 10K hours per week). <a href="https://generalistai.com/blog/gen-0">generalistai.com/blog/gen-0</a></li>
<li id="ref-18">Generalist AI, "GEN-1," 2026 ("The pretraining dataset contains no robot data"; wearable-device corpus). <a href="https://generalistai.com/blog/gen-1">generalistai.com/blog/gen-1</a></li>
<li id="ref-19">Xiaomi Robotics Team, "Xiaomi-Robotics-1: Scaling Vision-Language-Action Models with over 100K Hours of Real-World Trajectories," 2026. <a href="https://arxiv.org/abs/2607.15330">arXiv:2607.15330</a></li>
<li id="ref-20">NVIDIA, "GR00T N1: An Open Foundation Model for Generalist Humanoid Robots," 2025 (2.2B parameters). <a href="https://arxiv.org/abs/2503.14734">arXiv:2503.14734</a></li>
<li id="ref-21">The author's 2D obstacle-avoidance and statistical simulations, 2026. They include the hidden-variable ablation, the local conditional-variance estimate, training curves, the episodes-versus-frames comparison, the observation-target decomposition, the open-loop versus closed-loop comparison, evaluation sampling, and the stick-slip simulation. The text shows a single-step update example; the full experiment scripts are not yet published with the article, and the numbers apply only to the corresponding simulation setups.</li>
<li id="ref-22">"FACT: Demystifying When and Why VLAs Fail in Contact-Rich Tasks and How to Fix Them," 2026. <a href="https://arxiv.org/abs/2608.01402">arXiv:2608.01402</a>. Analyzes force control and other failure factors in contact-rich tasks.</li>
<li id="ref-23">Niu et al., "T-Rex: Tactile-Reactive Dexterous Manipulation," 2026. <a href="https://arxiv.org/abs/2606.17055">arXiv:2606.17055</a>. Reports about 100 hours of tactile manipulation data.</li>
<li id="ref-24">Bauza &amp; Rodriguez, "A Probabilistic Data-Driven Model for Planar Pushing," 2017 (repeating the same push on real hardware yields a distribution of outcomes). <a href="https://arxiv.org/abs/1704.03033">arXiv:1704.03033</a></li>
<li id="ref-25">Denton &amp; Fergus, "Stochastic Video Generation with a Learned Prior," ICML 2018. <a href="https://arxiv.org/abs/1802.07687">arXiv:1802.07687</a>. Models the uncertain future in video with stochastic latent variables.</li>
<li id="ref-26">Bruce et al. (Google DeepMind), "Genie: Generative Interactive Environments," ICML 2024 (a world model trained on unlabeled internet video that learns a controllable latent action space without ever seeing an action label). <a href="https://arxiv.org/abs/2402.15391">arXiv:2402.15391</a></li>
<li id="ref-27">Zhang et al., "Understanding Deep Learning Requires Rethinking Generalization," ICLR 2017. <a href="https://arxiv.org/abs/1611.03530">arXiv:1611.03530</a></li>
<li id="ref-28">Arpit et al., "A Closer Look at Memorization in Deep Networks," ICML 2017. <a href="https://arxiv.org/abs/1706.05394">arXiv:1706.05394</a>. Studies how deep networks learn patterns and memorize training samples.</li>
<li id="ref-29">Chi et al., "Diffusion Policy: Visuomotor Policy Learning via Action Diffusion," RSS 2023. <a href="https://arxiv.org/abs/2303.04137">arXiv:2303.04137</a></li>
<li id="ref-30">Lin, Hu et al., "Data Scaling Laws in Imitation Learning for Robotic Manipulation," ICLR 2025. <a href="https://arxiv.org/abs/2410.18647">arXiv:2410.18647</a>. Studies how the number of environments, objects, and demonstrations affects generalization, with more than 40,000 demonstrations and more than 15,000 real-robot execution tests.</li>
<li id="ref-31">Toyota Research Institute et al., "A Systematic Study of Data Modalities and Strategies for Co-training Large Behavior Models for Robot Manipulation," 2026. <a href="https://arxiv.org/abs/2602.01067">arXiv:2602.01067</a>. Compares 89 policies across 58,000 simulated and 2,835 real-robot execution tests.</li>
<li id="ref-32">Shi, Chen et al. (AgiBot), "Is Diversity All You Need for Scalable Robotic Manipulation?" 2025 (task diversity beats per-task quantity; debiasing operator diversity helps). <a href="https://arxiv.org/abs/2507.06219">arXiv:2507.06219</a></li>
<li id="ref-33">Saxena, Bronars et al., "What Matters in Learning from Large-Scale Datasets for Robot Manipulation" (MimicLabs), ICLR 2025. <a href="https://arxiv.org/abs/2506.13536">arXiv:2506.13536</a></li>
<li id="ref-34">Zheng et al., "Data Scaling Laws for Imitation Learning-Based End-to-End Autonomous Driving," 2024 (open-loop power law, r = −0.963, that did not carry over to closed loop). <a href="https://arxiv.org/abs/2412.02689">arXiv:2412.02689</a></li>
<li id="ref-35">The author's curve refits with an asymptotic term and bootstrap calculations on Dyna-2's published scale points, 2026. The extrapolation is sensitive to the fitted form and the asymptotic term; the full calculation scripts are not yet published with the article, and the result is not a prediction of a scale threshold or an arrival date.</li>
<li id="ref-36">Generalist AI, "GEN-1.5: Embodied Foundation Models are One-Shot Learners," August 2026. <a href="https://generalistai.com/blog/gen-1.5">generalistai.com/blog/gen-1.5</a>. Average success rate of 59% for in-context adaptation from a short demonstration and 83% after fine-tuning on five minutes of data per task; the reported ±10% and ±9% are standard deviations.</li>
<li id="ref-37">Wen et al., "Fighting Copycat Agents in Behavioral Cloning from Observation Histories," NeurIPS 2020. <a href="https://arxiv.org/abs/2010.14876">arXiv:2010.14876</a></li>
<li id="ref-38">de Haan, Jayaraman &amp; Levine, "Causal Confusion in Imitation Learning," NeurIPS 2019. <a href="https://arxiv.org/abs/1905.11979">arXiv:1905.11979</a></li>
<li id="ref-39">Zhou et al., "LIBERO-PRO: Towards Robust and Fair Evaluation of Vision-Language-Action Models Beyond Memorization," 2025. <a href="https://arxiv.org/abs/2510.03827">arXiv:2510.03827</a>. Evaluates models under perturbations of objects, initial states, task instructions, and environments.</li>
<li id="ref-40">Xing et al., "Shortcut Learning in Generalist Robot Policies: The Role of Dataset Diversity and Fragmentation," CoRL 2025. <a href="https://arxiv.org/abs/2508.06426">arXiv:2508.06426</a></li>
<li id="ref-41">Baniodeh et al. (Waymo), "Scaling Laws of Motion Forecasting and Planning," 2025. <a href="https://arxiv.org/abs/2506.08228">arXiv:2506.08228</a>. Uses 500,000 hours of driving data and reports that closed-loop metrics improve with scale in its setup.</li>
<li id="ref-42">Ross &amp; Bagnell, "Efficient Reductions for Imitation Learning," AISTATS 2010. <a href="https://proceedings.mlr.press/v9/ross10a.html">PMLR 9:661–668</a>. Analyzes error accumulation in behavior cloning; for the DAgger follow-up see Ross, Gordon &amp; Bagnell, 2011, <a href="https://arxiv.org/abs/1011.0686">arXiv:1011.0686</a>.</li>
<li id="ref-43">Rajaraman et al., "Toward the Fundamental Limits of Imitation Learning," NeurIPS 2020. <a href="https://arxiv.org/abs/2009.05990">arXiv:2009.05990</a>. Analyzes the sample complexity of imitation learning under different policy and environment assumptions.</li>
<li id="ref-44">Foster, Block &amp; Misra, "Is Behavior Cloning All You Need? Understanding Horizon in Imitation Learning," NeurIPS 2024. <a href="https://arxiv.org/abs/2407.15007">arXiv:2407.15007</a>. Analyzes the horizon dependence of log loss under conditions on realizability, the range of cumulative return, and policy-class complexity.</li>
<li id="ref-45">NVIDIA Technical Blog, "How to Evaluate General-Purpose Robot Policies for Real-World Deployment," 2026. <a href="https://developer.nvidia.com/blog/how-to-evaluate-general-purpose-robot-policies-for-real-world-deployment/">developer.nvidia.com</a>. Discusses evaluation metrics, trial counts, and Clopper-Pearson confidence intervals.</li>
<li id="ref-46">Sergey Arkhangelskiy, "PhAIL: A Real-Robot VLA Benchmark and Distributional Methodology," 2026 (evaluation-practice survey: real-robot VLA evaluation "still rests on binary success rate at a fixed timeout with N ≤ 25 rollouts per condition, almost always without confidence intervals"). <a href="https://arxiv.org/abs/2605.29710">arXiv:2605.29710</a></li>
<li id="ref-47">Li et al., "Evaluating Real-World Robot Manipulation Policies in Simulation" (SIMPLER), CoRL 2024. <a href="https://arxiv.org/abs/2405.05941">arXiv:2405.05941</a> · <a href="https://simpler-env.github.io/">simpler-env.github.io</a></li>
<li id="ref-48">Zhou et al., "AutoEval: Autonomous Evaluation of Generalist Robot Manipulation Policies in the Real World," 2025. <a href="https://arxiv.org/abs/2503.24278">arXiv:2503.24278</a></li>
</ol>
</details>
