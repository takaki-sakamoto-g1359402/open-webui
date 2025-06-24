import os
from typing import Optional

from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma

# Module-level variables to hold the vector store and QA chain
_VECTORSTORE: Optional[Chroma] = None
_QA_CHAIN: Optional[RetrievalQA] = None


def load_vectorstore(persist_directory: str) -> None:
    """Load a Chroma vector store from ``persist_directory``.

    The store is opened using :class:`~langchain.vectorstores.Chroma`
    with embeddings computed via :class:`~langchain.embeddings.OpenAIEmbeddings`.
    A :class:`~langchain.chains.RetrievalQA` chain backed by ``gpt-4o`` is also
    prepared and cached for subsequent calls to :func:`qa`.

    The function expects the ``OPENAI_API_KEY`` environment variable to be set.

    Parameters
    ----------
    persist_directory:
        Filesystem path where the vector store data is stored.
    """

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")

    embeddings = OpenAIEmbeddings(openai_api_key=api_key)
    global _VECTORSTORE, _QA_CHAIN
    _VECTORSTORE = Chroma(persist_directory=persist_directory,
                          embedding_function=embeddings)
    llm = ChatOpenAI(model_name="gpt-4o", openai_api_key=api_key)
    _QA_CHAIN = RetrievalQA.from_chain_type(llm=llm,
                                           retriever=_VECTORSTORE.as_retriever())


def qa(query: str) -> str:
    """Run a retrieval‑augmented query against the loaded vector store.

    :func:`load_vectorstore` must have been called prior to invoking this
    function.

    Parameters
    ----------
    query:
        The natural language query to answer.

    Returns
    -------
    str
        The answer returned by the QA chain.
    """
    if _QA_CHAIN is None:
        raise RuntimeError("Vector store not loaded; call load_vectorstore first")

    result = _QA_CHAIN.invoke({"query": query})
    return result.get("result", "")
