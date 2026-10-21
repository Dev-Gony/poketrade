"""Gradle JUnit XML 결과를 GitHub Actions 작업 요약(Markdown)으로 변환한다.

사용: python3 .github/scripts/junit_summary.py build/test-results/test >> "$GITHUB_STEP_SUMMARY"

- 테스트 클래스별 성공/실패 표
- 테스트가 stdout 으로 남긴 "[RESULT] ..." 줄(동시성 테스트의 성공·실패 건수 등)
"""

import glob
import os
import sys
import xml.etree.ElementTree as ET


def main(results_dir: str) -> int:
    files = sorted(glob.glob(os.path.join(results_dir, "TEST-*.xml")))
    if not files:
        print("> 테스트 결과 파일이 없습니다.")
        return 0

    total = failed = 0
    rows = []
    results = []
    for path in files:
        suite = ET.parse(path).getroot()
        suite_name = suite.get("name", "").rsplit(".", 1)[-1]
        for case in suite.iter("testcase"):
            total += 1
            broken = case.find("failure") is not None or case.find("error") is not None
            skipped = case.find("skipped") is not None
            failed += broken
            mark = "❌" if broken else ("⏭️" if skipped else "✅")
            rows.append(f"| {mark} | `{suite_name}` | {case.get('name', '')} | {float(case.get('time', 0)):.2f}s |")
        out = suite.findtext("system-out") or ""
        results += [f"- **{suite_name}** — {line.strip()[len('[RESULT]'):].strip()}" for line in out.splitlines() if line.strip().startswith("[RESULT]")]

    status = "✅ 모두 통과" if failed == 0 else f"❌ {failed}건 실패"
    print(f"## 백엔드 테스트: {status} ({total - failed}/{total})\n")
    if results:
        print("### 동시성 검증 결과\n")
        print("\n".join(results))
        print()
    print("| 결과 | 클래스 | 테스트 | 시간 |\n| --- | --- | --- | --- |")
    print("\n".join(rows))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "build/test-results/test"))
