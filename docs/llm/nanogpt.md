# nanoGPT 初学者学习笔记

这份文档是给初学者看的，不追求一开始讲完所有细节，而是先建立整体感觉，再逐步把项目代码和核心概念对应起来。

## 1. 这个项目大概在做什么

nanoGPT 是一个用来训练小型 GPT 文本生成模型的项目。

它的核心任务只有一句话：

```text
根据前面的文字，预测下一个 token。
```

比如给模型：

```text
To be or not to
```

模型要猜下一个可能是：

```text
be
```

训练很多次之后，模型就能根据一个开头继续生成文本。

## 2. 整体流程

整个项目可以先理解成 4 步：

```text
1. 准备数据
2. 定义模型
3. 训练模型
4. 使用模型生成文本
```

对应到项目文件：

```text
data/*/prepare.py  -> 把文字变成数字 token
model.py           -> 定义 GPT 模型
train.py           -> 训练模型
sample.py          -> 加载模型并生成文本
config/*.py        -> 不同训练任务的配置
```

更完整的流水线是：

```text
原始文本
  -> prepare.py 转成 train.bin / val.bin
  -> train.py 读取数据
  -> model.py 里的 GPT 做预测
  -> loss 衡量预测错多少
  -> 反向传播和 optimizer 修改参数
  -> 保存 ckpt.pt
  -> sample.py 加载 ckpt.pt 生成文本
```

### 2.1 项目总流程图

![nanoGPT 全链路总览](assets/learning/nanogpt-overview.png)

```mermaid
flowchart TD
    A["原始文本<br/>input.txt"] --> B["数据准备脚本<br/>data/*/prepare.py"]
    B --> C["数字 token 文件<br/>train.bin / val.bin"]
    C --> D["训练脚本<br/>train.py"]
    D --> E["取训练题目<br/>get_batch(): X / Y"]
    E --> F["GPT 模型<br/>model.py"]
    F --> G["预测结果<br/>logits"]
    G --> H["计算错误程度<br/>cross entropy loss"]
    H --> I["反向传播<br/>backward()"]
    I --> J["优化器更新参数<br/>AdamW step()"]
    J --> K["保存模型<br/>ckpt.pt"]
    K --> L["生成脚本<br/>sample.py"]
    L --> M["一个 token 一个 token 生成文本"]
```

### 2.2 训练主循环时序图

这张图看的是 `train.py` 训练时一次迭代里各个部分的调用顺序。

```mermaid
sequenceDiagram
    participant Train as 训练脚本
    participant Data as 取数据
    participant Model as GPT模型
    participant Loss as 计算损失
    participant Backward as 反向传播
    participant Optim as 优化器

    Train->>Data: 读取一批 X / Y
    Data-->>Train: 返回题目 X 和答案 Y
    Train->>Model: logits, loss = model(X, Y)
    Model->>Loss: 用 logits 和 Y 计算 loss
    Loss-->>Train: 返回 loss
    Train->>Backward: loss.backward()
    Backward-->>Train: 得到每个参数的梯度
    Train->>Optim: optimizer.step()
    Optim-->>Train: 更新模型参数
    Train->>Optim: optimizer.zero_grad()
```

## 3. 为什么文字要变成数字

神经网络本质上只会做数学计算，比如加法、乘法、矩阵运算。

它不能直接理解：

```text
hello
```

所以要先把文字变成数字。

比如我们规定：

```text
h -> 1
e -> 2
l -> 3
o -> 4
```

那么：

```text
hello
```

就会变成：

```text
[1, 2, 3, 3, 4]
```

这些数字一开始只是编号，不代表真正含义。真正进入模型后，它们还会被转换成向量，这一步叫 embedding。

项目中对应的数据准备脚本：

```text
data/shakespeare_char/prepare.py
```

这个脚本会把莎士比亚文本里的每个字符映射成一个整数。

### 3.1 文字变数字流程图

```mermaid
flowchart LR
    A["原始文字<br/>hello"] --> B["建立词表<br/>h,e,l,o"]
    B --> C["字符到 ID<br/>h=1,e=2,l=3,o=4"]
    C --> D["编码结果<br/>[1,2,3,3,4]"]
    D --> E["保存到文件<br/>train.bin / val.bin"]
    B --> F["保存映射关系<br/>meta.pkl"]
```

## 4. x 和 y 是什么

GPT 训练时做的是：

```text
根据前文，预测下一个 token。
```

假设原始文本是：

```text
hello
```

编码后是：

```text
[1, 2, 3, 3, 4]
```

训练时会拆成：

```text
x = [1, 2, 3, 3]
y = [2, 3, 3, 4]
```

也就是：

```text
x: h e l l
y: e l l o
```

模型要学会：

```text
看到 h        -> 预测 e
看到 h e      -> 预测 l
看到 h e l    -> 预测 l
看到 h e l l  -> 预测 o
```

所以可以先记住：

```text
x 是题目
y 是答案
```

项目中对应代码：

```text
train.py 里的 get_batch(split)
```

它会从一大串 token 里随机截一段作为 x，再把这段整体右移一位作为 y。

### 4.1 x / y 切片图

```mermaid
flowchart TD
    A["完整 token 流<br/>[10,11,12,13,14,15,16]"] --> B["随机选一个起点 i"]
    B --> C["取 block_size 个 token 作为 X<br/>[10,11,12,13]"]
    B --> D["从 i+1 开始取 block_size 个 token 作为 Y<br/>[11,12,13,14]"]
    C --> E["题目 X<br/>模型看到的内容"]
    D --> F["答案 Y<br/>每个位置的下一个 token"]
```

### 4.2 预测位置对应关系

```mermaid
flowchart LR
    X1["X[0] = h"] --> Y1["预测 Y[0] = e"]
    X2["X[0..1] = h e"] --> Y2["预测 Y[1] = l"]
    X3["X[0..2] = h e l"] --> Y3["预测 Y[2] = l"]
    X4["X[0..3] = h e l l"] --> Y4["预测 Y[3] = o"]
```

## 5. embedding 是什么

前面说过，token 会先变成整数 ID。

比如：

```text
h -> 1
e -> 2
l -> 3
```

但是这些 ID 只是编号，模型不能直接从编号里理解语言。

所以模型会把每个 ID 转成一组可以学习的数字：

```text
1 -> [0.12, -0.30, 0.44, 0.91]
2 -> [-0.51, 0.22, 0.18, -0.07]
3 -> [0.33, 0.80, -0.12, 0.45]
```

这个过程叫 embedding。

可以把 embedding 理解成：

```text
给每个 token 发一张可学习的特征卡。
```

在 nanoGPT 里主要有两种 embedding：

```text
token embedding     -> 表示这个 token 是什么
position embedding  -> 表示这个 token 在第几个位置
```

为什么需要位置？

因为：

```text
我喜欢你
你喜欢我
```

这两句话用到的字很像，但顺序不同，意思也不同。

所以模型真正拿到的是：

```text
token embedding + position embedding
```

对应代码在：

```text
model.py 里的 GPT.forward()
```

### 5.1 embedding 流程图

```mermaid
flowchart TD
    A["输入 token ID<br/>[1,2,3,3]"] --> B["token embedding<br/>这个 token 是什么"]
    A --> C["position embedding<br/>这个 token 在哪里"]
    B --> D["相加"]
    C --> D
    D --> E["模型真正处理的向量序列"]
    E --> F["送入 Transformer Block"]
```

## 6. attention 是什么

attention 可以先理解成：

```text
当前 token 回头看前面的 token，并判断哪些更重要。
```

比如：

```text
我 喜欢 苹果，因为 它 很 甜
```

当模型看到“它”的时候，它需要知道“它”大概率指的是“苹果”。

attention 做的事情就是让“它”回头看前文，并给不同位置分配不同重要性：

```text
我       重要性低
喜欢     重要性低
苹果     重要性高
因为     重要性中
```

GPT 使用的是 causal attention，也就是因果注意力。

它有一个重要限制：

```text
当前位置只能看自己和前面的内容，不能偷看后面的答案。
```

例如：

```text
第 1 个 token：只能看第 1 个
第 2 个 token：可以看第 1、2 个
第 3 个 token：可以看第 1、2、3 个
第 4 个 token：可以看第 1、2、3、4 个
```

这能保证训练时模型没有作弊。

对应代码在：

```text
model.py 里的 CausalSelfAttention
```

### 6.1 causal attention 可见范围图

```mermaid
flowchart TD
    T1["第 1 个 token<br/>我"] --> V1["只能看：我"]
    T2["第 2 个 token<br/>喜"] --> V2["能看：我、喜"]
    T3["第 3 个 token<br/>欢"] --> V3["能看：我、喜、欢"]
    T4["第 4 个 token<br/>学"] --> V4["能看：我、喜、欢、学"]
    T5["未来 token<br/>习"] -. "不能偷看" .-> T1
    T5 -. "不能偷看" .-> T2
    T5 -. "不能偷看" .-> T3
    T5 -. "不能偷看" .-> T4
```

## 7. Q、K、V 是什么

attention 里面经常看到三个词：

```text
Q = Query
K = Key
V = Value
```

可以用图书馆找书来理解：

```text
Q：我想找什么？
K：这本书的标签是什么？
V：这本书真正的内容是什么？
```

放到模型里：

```text
Q 负责提问
K 负责匹配
V 负责提供信息
```

当前 token 会用自己的 Q 去匹配前面 token 的 K，匹配分数越高，就越关注那个 token，然后读取它的 V。

一句话记住：

```text
Q 和 K 决定看谁，V 决定拿到什么信息。
```

对应代码在：

```text
model.py 里的 CausalSelfAttention.forward()
```

### 7.1 Q/K/V 匹配图

```mermaid
flowchart LR
    A["当前 token：它"] --> Q["Q<br/>我想找什么"]
    P1["前文 token：我"] --> K1["K<br/>标签"]
    P2["前文 token：喜欢"] --> K2["K<br/>标签"]
    P3["前文 token：苹果"] --> K3["K<br/>标签"]
    Q --> S1["匹配分数低"]
    K1 --> S1
    Q --> S2["匹配分数低"]
    K2 --> S2
    Q --> S3["匹配分数高"]
    K3 --> S3
    P3 --> V3["V<br/>苹果的信息"]
    S3 --> V3
    V3 --> O["当前 token 吸收上下文信息"]
```

## 8. multi-head attention 是什么

multi-head attention 叫多头注意力。

它的直觉是：

```text
让多个小助手从不同角度看同一句话。
```

一个 head 可能关注“代词指代”，另一个 head 可能关注“主语和动作”，还有一个 head 可能关注“标点和换行”。

所以：

```text
single-head attention = 一个视角看上下文
multi-head attention  = 多个视角同时看上下文
```

在配置文件里可以看到：

```python
n_head = 6
```

这表示模型有 6 个 attention head。

对应配置：

```text
config/train_shakespeare_char.py
```

### 8.1 多头注意力图

```mermaid
flowchart TD
    A["同一段上下文"] --> H1["Head 1<br/>关注代词指代"]
    A --> H2["Head 2<br/>关注主语动作"]
    A --> H3["Head 3<br/>关注修饰关系"]
    A --> H4["Head 4<br/>关注标点换行"]
    H1 --> M["合并多个视角"]
    H2 --> M
    H3 --> M
    H4 --> M
    M --> O["更丰富的上下文表示"]
```

## 9. Transformer Block 是什么

GPT 不是只有一层 attention，而是很多个 Transformer Block 堆起来。

![GPT 模型内部结构总览](assets/learning/gpt-model-structure.png)

一个 block 大概是：

```text
输入
  -> LayerNorm
  -> Attention
  -> 残差连接
  -> LayerNorm
  -> MLP
  -> 残差连接
  -> 输出
```

可以先这样理解：

```text
Attention 负责和上下文交流
MLP 负责对当前信息再加工
残差连接负责保留原始信息，同时叠加新理解
```

在配置里：

```python
n_layer = 6
```

表示有 6 个 Transformer Block。

对应代码：

```text
model.py 里的 Block
model.py 里的 GPT
```

### 9.1 Transformer Block 结构图

```mermaid
flowchart TD
    A["输入 x"] --> B["LayerNorm"]
    B --> C["Causal Self-Attention"]
    C --> D["残差连接<br/>x + attention结果"]
    D --> E["LayerNorm"]
    E --> F["MLP"]
    F --> G["残差连接<br/>上一步结果 + MLP结果"]
    G --> H["输出"]
```

### 9.2 GPT 模型堆叠图

```mermaid
flowchart TD
    A["token + position embedding"] --> B1["Transformer Block 1"]
    B1 --> B2["Transformer Block 2"]
    B2 --> B3["..."]
    B3 --> B4["Transformer Block n_layer"]
    B4 --> C["最终 LayerNorm"]
    C --> D["lm_head"]
    D --> E["logits"]
```

## 10. logits 和 softmax 是什么

模型经过多层 Transformer Block 之后，每个位置都会得到一个向量。

比如输入：

```text
我 喜 欢 学
```

最后一个位置“学”会得到一个向量。

接下来模型要把这个向量变成：

```text
下一个 token 是谁？
```

模型会给词表里的每个 token 打一个原始分数，这些分数叫 logits。

例如：

```text
我：-1.2
喜： 0.3
欢： 0.8
学：-0.5
习： 3.1
```

这些分数还不是概率，因为它们可以是负数，也不会加起来等于 1。

softmax 的作用是：

```text
把 logits 转成概率。
```

例如：

```text
我：2%
喜：5%
欢：9%
学：3%
习：81%
```

所以：

```text
logits -> softmax -> 每个 token 的概率
```

对应代码：

```text
model.py 里的 lm_head
model.py 里的 generate()
```

### 10.1 logits 到概率图

```mermaid
flowchart LR
    A["最后一个位置的向量"] --> B["lm_head"]
    B --> C["logits<br/>我:-1.2 喜:0.3 欢:0.8 学:-0.5 习:3.1"]
    C --> D["softmax"]
    D --> E["概率<br/>我:2% 喜:5% 欢:9% 学:3% 习:81%"]
    E --> F["选择或采样下一个 token<br/>习"]
```

## 11. loss 是什么

loss 用来衡量模型预测错得有多严重。

如果正确答案是：

```text
习
```

模型预测：

```text
习：80%
```

那 loss 会比较低。

如果模型预测：

```text
习：10%
```

那 loss 会比较高。

nanoGPT 使用的是 cross entropy loss，也就是交叉熵损失。

可以先理解为：

```text
惩罚模型没有把正确答案放到高概率位置。
```

对应代码：

```text
model.py 里的 F.cross_entropy(...)
```

训练的目标就是：

```text
让 loss 越来越小。
```

### 11.1 loss 计算位置图

```mermaid
flowchart TD
    A["模型输入 X"] --> B["GPT.forward()"]
    B --> C["预测 logits"]
    D["正确答案 Y"] --> E["cross entropy"]
    C --> E
    E --> F["loss<br/>预测错得有多严重"]
```

## 12. 反向传播和 optimizer 是什么

模型里面有很多参数，可以先理解成很多“旋钮”。

一开始这些参数大多是随机的，所以模型乱猜，loss 很高。

训练就是不断调整这些参数，让 loss 变小。

完整过程是：

```text
1. 模型拿到 x
2. 向前计算，得到预测 logits
3. 和 y 比较，得到 loss
4. 反向传播，计算每个参数的梯度
5. optimizer 根据梯度更新参数
6. 清空旧梯度，准备下一轮
```

可以记成：

```text
预测 -> 算错多少 -> 找责任 -> 改参数 -> 再来一次
```

专业词是：

```text
forward -> loss -> backward -> optimizer step -> zero grad
```

在 nanoGPT 里对应：

```python
logits, loss = model(X, Y)
scaler.scale(loss).backward()
scaler.step(optimizer)
optimizer.zero_grad(set_to_none=True)
```

其中：

```text
backward     -> 根据 loss 计算梯度
optimizer    -> 根据梯度更新模型参数
zero_grad    -> 清空旧梯度
```

nanoGPT 用的是 AdamW optimizer。

对应代码：

```text
train.py 的训练循环
model.py 里的 configure_optimizers()
```

### 12.1 参数更新闭环图

![nanoGPT 训练循环总览](assets/learning/training-loop-overview.png)

```mermaid
flowchart TD
    A["当前模型参数"] --> B["forward<br/>用 X 做预测"]
    B --> C["计算 loss<br/>和 Y 比较"]
    C --> D["backward<br/>计算梯度"]
    D --> E["optimizer.step()<br/>更新参数"]
    E --> F["zero_grad()<br/>清空旧梯度"]
    F --> A
```

### 12.2 训练过程中的关键代码时序

```mermaid
sequenceDiagram
    participant TrainLoop as 训练循环
    participant Batch as 取训练数据
    participant Forward as 前向计算
    participant Grad as 反向传播
    participant Step as 优化器更新
    participant Clear as 清空梯度

    TrainLoop->>Batch: 取一批训练数据
    Batch-->>TrainLoop: X, Y
    TrainLoop->>Forward: 前向计算
    Forward-->>TrainLoop: logits, loss
    TrainLoop->>Grad: 反向传播
    Grad-->>TrainLoop: 参数上累积梯度
    TrainLoop->>Step: 优化器更新参数
    Step-->>TrainLoop: 参数变得稍微更好
    TrainLoop->>Clear: 清空梯度
```

## 13. 生成文本时发生了什么

训练完成后，会得到一个 checkpoint：

```text
ckpt.pt
```

生成文本时，流程是：

```text
1. 加载训练好的模型
2. 输入一个开头 prompt
3. 模型预测下一个 token
4. 把预测出来的 token 接到原文后面
5. 再预测下一个 token
6. 重复很多次
```

也就是说，GPT 不是一次生成整篇文章，而是：

```text
一个 token 一个 token 地往后接。
```

对应代码：

```text
sample.py
model.py 里的 generate()
```

### 13.1 生成文本时序图

```mermaid
sequenceDiagram
    participant User as 输入开头
    participant Sample as 生成脚本
    participant Model as GPT生成
    participant Softmax as 概率采样
    participant Text as 输出文本

    User->>Sample: 输入开头文本
    Sample->>Model: 编码成 token ID
    loop 每次生成 1 个 token
        Model->>Model: 只保留最近 block_size 个 token
        Model->>Softmax: 计算下一个 token 概率
        Softmax-->>Model: 采样出一个 token
        Model->>Model: 把新 token 拼到末尾
    end
    Model-->>Sample: 返回完整 token 序列
    Sample->>Text: decode 成文字并打印
```

### 13.2 生成闭环图

```mermaid
flowchart LR
    A["输入开头<br/>KING:"] --> B["编码成 token"]
    B --> C["GPT 预测下一个 token"]
    C --> D["采样 token"]
    D --> E["追加到原序列"]
    E --> C
    E --> F["达到 max_new_tokens 后 decode 输出"]
```

## 14. 推荐学习顺序

建议不要一开始就啃完整代码，可以按这个顺序来：

```text
1. 先理解这个文档里的整体流程
2. 看 data/shakespeare_char/prepare.py
3. 看 train.py 里的 get_batch()
4. 看 model.py 里的 GPT.forward()
5. 看 model.py 里的 CausalSelfAttention
6. 看 train.py 的训练循环
7. 看 sample.py 和 generate()
```

最推荐先跑字符级 Shakespeare 示例，因为它最小、最直观。

准备数据：

```powershell
python data/shakespeare_char/prepare.py
```

CPU 上先跑一个小训练：

```powershell
python train.py config/train_shakespeare_char.py --device=cpu --compile=False --max_iters=200
```

生成文本：

```powershell
python sample.py --out_dir=out-shakespeare-char --device=cpu
```

### 14.1 代码阅读路线图

```mermaid
flowchart TD
    A["先读本学习笔记<br/>建立整体图"] --> B["data/shakespeare_char/prepare.py<br/>文字如何变 token"]
    B --> C["train.py:get_batch()<br/>X/Y 怎么生成"]
    C --> D["model.py:GPT.forward()<br/>模型前向流程"]
    D --> E["model.py:CausalSelfAttention<br/>attention 核心"]
    E --> F["model.py:Block<br/>Transformer Block"]
    F --> G["train.py 训练循环<br/>loss/backward/optimizer"]
    G --> H["sample.py + generate()<br/>生成文本"]
```

## 15. 先记住这张总图

```text
文字
  -> token 数字
  -> x / y 训练题目
  -> token embedding + position embedding
  -> 多层 Transformer Block
  -> logits
  -> softmax 概率
  -> loss
  -> backward 计算梯度
  -> optimizer 更新参数
  -> 训练完成
  -> generate 一个 token 一个 token 生成文本
```

如果只能记住一句话：

```text
nanoGPT 训练的核心，就是让模型不断练习“根据前文预测下一个 token”，并通过 loss、反向传播和 optimizer 一点点改进自己。
```
