import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_PROJECTS = [
  "AI学习",
  "时间管理大师开发",
  "车机语音包",
  "短视频制作",
  "视频拆解",
  "内容创作",
  "添加指令",
  "家庭事务",
  "临时任务"
];

const PRIORITIES = ["高", "中", "低"];
const STORAGE_KEY = "time-management-master-mvp";
const DEFAULT_MINUTES = 60;
const DEFAULT_SECONDS = DEFAULT_MINUTES * 60;

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function getMinutesBetween(start, end) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function priorityRank(priority) {
  return { 高: 0, 中: 1, 低: 2 }[priority] ?? 3;
}

function mergeProjects(savedProjects = []) {
  return Array.from(new Set([...savedProjects, ...DEFAULT_PROJECTS]));
}

function App() {
  const savedState = loadState();
  const [projects] = useState(mergeProjects(savedState?.projects));
  const [tasks, setTasks] = useState(savedState?.tasks ?? []);
  const [records, setRecords] = useState(savedState?.records ?? []);
  const [focusCount, setFocusCount] = useState(savedState?.focusCount ?? {});
  const [taskText, setTaskText] = useState("");
  const [taskProject, setTaskProject] = useState(DEFAULT_PROJECTS[0]);
  const [taskPriority, setTaskPriority] = useState("中");
  const [recordProject, setRecordProject] = useState(DEFAULT_PROJECTS[0]);
  const [recordContent, setRecordContent] = useState("");
  const [recordStart, setRecordStart] = useState("");
  const [recordEnd, setRecordEnd] = useState("");
  const [recordSummary, setRecordSummary] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [lastFocusRecord, setLastFocusRecord] = useState(null);
  const focusStartRef = useRef(null);

  const today = todayKey();

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projects, tasks, records, focusCount })
    );
  }, [projects, tasks, records, focusCount]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          finishFocus();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  function playBeep() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.7);
  }

  function finishFocus() {
    setIsRunning(false);
    const now = new Date();
    const startedAt = focusStartRef.current ?? new Date(now.getTime() - DEFAULT_SECONDS * 1000);
    const newFocus = {
      project: recordProject,
      content: "专注计时完成",
      start: startedAt.toISOString().slice(0, 16),
      end: now.toISOString().slice(0, 16),
      minutes: Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 60000)),
      summary: ""
    };
    setLastFocusRecord(newFocus);
    setFocusCount((current) => ({ ...current, [today]: (current[today] ?? 0) + 1 }));
    playBeep();
    window.alert("专注时间结束了，可以保存为学习记录。");
  }

  function addTask(event) {
    event.preventDefault();
    const text = taskText.trim();
    if (!text) return;
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        text,
        project: taskProject,
        priority: taskPriority,
        completed: false,
        date: today,
        completedAt: null
      },
      ...current
    ]);
    setTaskText("");
  }

  function toggleTask(taskId) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? new Date().toISOString() : null
            }
          : task
      )
    );
  }

  function deleteTask(taskId) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function startTimer() {
    if (!focusStartRef.current || secondsLeft === DEFAULT_SECONDS) {
      focusStartRef.current = new Date();
    }
    setIsRunning(true);
  }

  function pauseTimer() {
    setIsRunning(false);
  }

  function resetTimer() {
    setIsRunning(false);
    setSecondsLeft(DEFAULT_SECONDS);
    setLastFocusRecord(null);
    focusStartRef.current = null;
  }

  function addRecord(event) {
    event.preventDefault();
    const content = recordContent.trim();
    if (!content || !recordStart || !recordEnd) return;
    setRecords((current) => [
      {
        id: crypto.randomUUID(),
        project: recordProject,
        content,
        start: recordStart,
        end: recordEnd,
        minutes: getMinutesBetween(recordStart, recordEnd),
        summary: recordSummary.trim()
      },
      ...current
    ]);
    setRecordContent("");
    setRecordStart("");
    setRecordEnd("");
    setRecordSummary("");
  }

  function saveFocusRecord() {
    if (!lastFocusRecord) return;
    setRecords((current) => [
      {
        id: crypto.randomUUID(),
        ...lastFocusRecord,
        summary: lastFocusRecord.summary || "完成一次专注学习"
      },
      ...current
    ]);
    setLastFocusRecord(null);
    resetTimer();
  }

  function deleteRecord(recordId) {
    setRecords((current) => current.filter((record) => record.id !== recordId));
  }

  const todaysTasks = useMemo(
    () => tasks.filter((task) => task.date === today),
    [tasks, today]
  );

  const topThreeTasks = useMemo(
    () =>
      todaysTasks
        .filter((task) => !task.completed)
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
        .slice(0, 3),
    [todaysTasks]
  );

  const todaysRecords = useMemo(
    () => records.filter((record) => todayKey(new Date(record.start)) === today),
    [records, today]
  );

  const totalStudyMinutes = todaysRecords.reduce((sum, record) => sum + record.minutes, 0);
  const completedTasks = todaysTasks.filter((task) => task.completed).length;
  const projectMinutes = projects.map((project) => ({
    project,
    minutes: todaysRecords
      .filter((record) => record.project === project)
      .reduce((sum, record) => sum + record.minutes, 0)
  }));

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <header className="mx-auto mb-5 flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-700">时间管理大师 MVP</p>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
            时间管理大师
          </h1>
        </div>
        <p className="text-sm text-slate-500">今日：{today}</p>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
        <Panel title="今日任务">
          <form onSubmit={addTask} className="space-y-3">
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={taskText}
              onChange={(event) => setTaskText(event.target.value)}
              placeholder="输入今天要做的事"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={taskProject} onChange={setTaskProject} options={projects} />
              <Select value={taskPriority} onChange={setTaskPriority} options={PRIORITIES} />
            </div>
            <button className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              添加任务
            </button>
          </form>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">今天最重要的3件事</h3>
            <div className="space-y-2">
              {topThreeTasks.length === 0 ? (
                <EmptyText text="暂无未完成任务" />
              ) : (
                topThreeTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))
              )}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">全部今日任务</h3>
            <div className="space-y-2">
              {todaysTasks.length === 0 ? (
                <EmptyText text="还没有添加任务" />
              ) : (
                todaysTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))
              )}
            </div>
          </div>
        </Panel>

        <Panel title="专注计时器">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">默认 {DEFAULT_MINUTES} 分钟</p>
            <div className="my-5 text-6xl font-bold tabular-nums text-slate-950">
              {formatClock(secondsLeft)}
            </div>
            <Select value={recordProject} onChange={setRecordProject} options={projects} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={startTimer}
                disabled={isRunning || secondsLeft === 0}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {secondsLeft === DEFAULT_SECONDS ? "开始" : "继续"}
              </button>
              <button
                type="button"
                onClick={pauseTimer}
                disabled={!isRunning}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                暂停
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                重置
              </button>
            </div>
          </div>

          {lastFocusRecord && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">刚刚完成一次专注</p>
              <p className="mt-1 text-sm text-emerald-800">
                {lastFocusRecord.project}，{formatDuration(lastFocusRecord.minutes)}
              </p>
              <button
                type="button"
                onClick={saveFocusRecord}
                className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                保存为学习记录
              </button>
            </div>
          )}
        </Panel>

        <Panel title="今日统计">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="完成任务" value={completedTasks} />
            <Stat label="学习时长" value={formatDuration(totalStudyMinutes)} />
            <Stat label="专注次数" value={focusCount[today] ?? 0} />
          </div>
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">各项目今日投入时间</h3>
            <div className="space-y-2">
              {projectMinutes.map((item) => (
                <div key={item.project} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-700">{item.project}</span>
                  <span className="font-semibold text-slate-950">{formatDuration(item.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mx-auto mt-4 max-w-7xl">
        <Panel title="学习记录">
          <form onSubmit={addRecord} className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_1fr_1.2fr_auto]">
            <Select value={recordProject} onChange={setRecordProject} options={projects} />
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={recordContent}
              onChange={(event) => setRecordContent(event.target.value)}
              placeholder="学习内容"
            />
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              type="datetime-local"
              value={recordStart}
              onChange={(event) => setRecordStart(event.target.value)}
            />
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              type="datetime-local"
              value={recordEnd}
              onChange={(event) => setRecordEnd(event.target.value)}
            />
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={recordSummary}
              onChange={(event) => setRecordSummary(event.target.value)}
              placeholder="今日一句总结"
            />
            <button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              添加
            </button>
          </form>

          <div className="mt-4 overflow-x-auto">
            {records.length === 0 ? (
              <EmptyText text="暂无学习记录" />
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">项目</th>
                    <th className="px-3 py-2">内容</th>
                    <th className="px-3 py-2">开始</th>
                    <th className="px-3 py-2">结束</th>
                    <th className="px-3 py-2">时长</th>
                    <th className="px-3 py-2">总结</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{record.project}</td>
                      <td className="px-3 py-2">{record.content}</td>
                      <td className="px-3 py-2">{record.start}</td>
                      <td className="px-3 py-2">{record.end}</td>
                      <td className="px-3 py-2">{formatDuration(record.minutes)}</td>
                      <td className="px-3 py-2">{record.summary || "无"}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => deleteRecord(record.id)}
                          className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-3">
      <input
        className="mt-1 h-4 w-4"
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
          {task.text}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {task.project} · 优先级：{task.priority}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
      >
        删除
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyText({ text }) {
  return <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">{text}</p>;
}

export default App;
