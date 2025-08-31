# ReLU Regions（Example）

小さな ReLU MLP（2→H1→H2→2）が入力平面を区分線形に分割し、折れ曲がる決定境界を作る様子を可視化する教育用サンプルです。OpenWebUI 本体とは無関係の examples 置き場です。

## Run
python relu_regions.py --epochs 2000 --lr 0.05 --hidden1 8 --hidden2 8 --grid 320 --plot-3d

## Outputs
- training_loss.png
- regions_layer1.png, regions_layer2.png
- decision_boundary.png
- prob_surface.png（--plot-3d 時）
