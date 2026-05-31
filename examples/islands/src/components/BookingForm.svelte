<script>
    let name = $state('')
    let date = $state('')
    let submitted = $state(false)

    const valid = $derived(name.trim() && date)

    function submit(e) {
        e.preventDefault()
        if (!valid) return
        submitted = true
    }
</script>

<form class="booking" onsubmit={submit}>
    {#if submitted}
        <p class="booking__ok">
            Thanks, {name}! Booked for {date}.
        </p>
    {:else}
        <label>
            Name
            <input bind:value={name} type="text" />
        </label>
        <label>
            Date
            <input bind:value={date} type="date" />
        </label>
        <button type="submit" disabled={!valid}>Book</button>
    {/if}
</form>
