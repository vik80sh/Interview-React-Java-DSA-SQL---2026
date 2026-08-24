import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { dataRes, getFeedData } from "./redux/feedRecuders";
import { AppDispatch, RootType } from "./redux/store";
import "./styles.css";

export default function InFiniteScroll() {
  const { status, loading, data } = useSelector(
    (state: RootType) => state.feed
  );
  const pageNumberRef = useRef(0);

  const loadRef = useRef<HTMLDivElement | null>(null);

  const dispatch = useDispatch<AppDispatch>();

  const feedData = () => {
    if (!loading) {
      const page = pageNumberRef.current;
      dispatch(getFeedData(page));
      pageNumberRef.current = page + 1;
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([enter]) => {
        if (enter.isIntersecting) {
          feedData();
        }
      },
      { threshold: 1 }
    );
    if (loadRef.current) {
      observer.observe(loadRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <h1>Feed with infinite scroll</h1>
      {data.map((feed: dataRes, index: number) => {
        return (
          <div
            key={feed.id}
            style={{
              padding: 10,
              margin: 10,
              backgroundColor: "#fff65f",
              textAlign: "left",
            }}
          >
            <div>Number: {index}</div>
            <div>{feed.title}</div>
            <div>{feed.body}</div>
          </div>
        );
      })}

      <div ref={loadRef}>Loading...</div>
    </div>
  );
}
