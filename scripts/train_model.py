"""
M11 — Train the match-outcome prediction model and print an evaluation report.

Run from the repo root so `import ml.*` resolves:
    .\\venv\\Scripts\\python.exe scripts\\train_model.py

Reads data/processed/schedule.parquet, trains the H/D/A classifier plus the
home/away expected-goals Poisson models, saves artifacts to ml/models/, and
prints accuracy vs baseline, log-loss, confusion matrix, and goal MAE/RMSE.
"""
import sys
import logging
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import ml.train as train

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")

SCHEDULE = ROOT / "data" / "processed" / "schedule.parquet"
MODELS_DIR = ROOT / "ml" / "models"


def main():
    report = train.run_full_training(SCHEDULE, MODELS_DIR)

    print("\n" + "=" * 60)
    print("M11 - PREDICTION MODEL TRAINED")
    print("=" * 60)
    c = report["classifier"]
    print(f"  Features:        {report['feature_count']}")
    print(f"  Train/Val/Test:  {report['n_train']} / {report['n_val']} / {report['n_test']}")
    print(f"  Model:           {c['model']}")
    print(f"  Accuracy:        {c['accuracy']:.3f}")
    print(f"  Balanced acc:    {c['balanced_accuracy']:.3f}")
    print(f"  Log-loss:        {c['log_loss']:.3f}")
    print(f"  Baseline acc:    {c['baseline_accuracy']:.3f}  (majority class)")
    print(f"  LogReg acc:      {c['lr_accuracy']:.3f}  (linear baseline)")
    print(f"  Class dist:      {c['class_distribution']}")
    print(f"  Confusion [H,D,A]:")
    for row in c["confusion_matrix"]:
        print(f"      {row}")
    g = report["goals"]
    print(f"\n  Expected goals (test):")
    print(f"    Home  MAE={g['home']['mae']:.3f}  RMSE={g['home']['rmse']:.3f}  r={g['home']['pearson_r']}")
    print(f"    Away  MAE={g['away']['mae']:.3f}  RMSE={g['away']['rmse']:.3f}  r={g['away']['pearson_r']}")
    print(f"\n  Artifacts saved to: {MODELS_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
